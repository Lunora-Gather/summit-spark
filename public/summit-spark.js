(async () => {
  "use strict";

  if (window.self !== window.top) {
    const notice = document.createElement("main");
    notice.className = "embedding-blocked";
    notice.setAttribute("role", "alert");
    const title = document.createElement("h1");
    title.textContent = "请直接打开山巅微光";
    const detail = document.createElement("p");
    detail.textContent = "为保护账号与云存档操作，本页面不在嵌入式窗口中运行。";
    notice.append(title, detail);
    document.body.replaceChildren(notice);
    return;
  }

  const [
    {
      escapeHtml,
      formatDelta,
      formatTime,
      splitGrade
    },
    {
      aabb,
      approach,
      distRectPoint
    },
    {
      CHAPTER_EXPERIENCE,
      CHAPTER_SURFACE_KINDS,
      EXPERT_REQUIREMENTS,
      EXPERT_REQUIREMENT_LABELS,
      maps,
      ROOM_ATMOSPHERES,
      ROOM_CHAPTER_LABELS,
      ROOM_GUIDES,
      ROOM_LANDMARKS,
      ROOM_NAMES,
      ROOM_PURPOSES,
      ROOM_ROUTE_LINES,
      ROOM_SKILLS,
      ROOM_STYLE_TRIALS,
      ROOM_TARGETS,
      ROOM_TIERS,
      ROOM_WHISPERS,
      SKILL_LABELS,
      mechanicFirstTouchCueData
    },
    {
      effectQueueLimit,
      enforceEffectQueueBudget
    },
    {
      ambientChapterCueData,
      chapterEntryCueData,
      summitCueData
    },
    {
      clampGamepadDeadzoneData,
      clampTouchSizeData,
      createRoomFocusEntryData,
      createSaveArchiveData,
      createSaveBackupData,
      finiteNonNegativeNumber,
      normalizeProfileData,
      normalizeRoomBestsData,
      normalizeRoomFocusData,
      normalizeRoomPathsData,
      normalizeSettingsData,
      parseSaveArchiveText,
      parseSaveBackupValue,
      readStoredJson: readStoredJsonData,
      writeStorageTransaction: writeStorageTransactionData
    },
    {
      defaultBindingsForLayoutData,
      effectiveBindingsData,
      clearInputEdges,
      clearInputBuffers,
      consumeInputBuffer,
      hasInputBuffer,
      inputHeldAny,
      inputPressedAny,
      isStartCodeData,
      keyCodeLabelData,
      pressInput,
      rebindActionData,
      releaseInput,
      releaseInputState,
      resolveGamepadState,
      resolveMovementInput,
      shouldBlockKeyData,
      setInputBuffer,
      syncInputHeld,
      tickInputBuffers,
      transitionDigitalInput,
      validBindingCodeData
    },
    {
      activeChallengeReviewData,
      activeChallengeStateData,
      activeRouteContractDataFor,
      advanceRouteContractData,
      challengeProgressData,
      createActiveChallengeData,
      createDrillData,
      createFeelCompletionResultData,
      createFeelInterruptionResultData,
      createRouteCompletionResultData,
      createRouteContractStateData,
      createRouteInterruptionResultData,
      drillContractProgressData,
      drillContractStatsData,
      drillSucceededData,
      feelFixtureMatchesDrillData,
      feelFixtureModeData,
      feelFixturePresentationData,
      leadingRoomReasonData,
      recordDrillClearData,
      recordDrillStartData,
      recordRoomClearData,
      recordRoomFaultData,
      reconcileChallengeWinsData,
      routeContractMatchesDrillData,
      routeContractResumeStepData,
      routeContractSummaryTextData,
      roomFocusScoreData,
      roomMasteryLevelData,
      roomMasteryScoreData,
      roomReviewModeData,
      trainingTransitionOptionsData
    },
    {
      replayActionMarkersData,
      replayGhostStateData
    },
    {
      chapterCompletionData: chapterCompletionModelData,
      chapterGrade,
      chapterTransitionResultData,
      postRunReviewData,
      rankPracticeLedgerRowsData,
      runChapterReviewData,
      runChapterSplitsData,
      runReportTextData,
      roomSplitFeedbackData,
      roomReviewPriorityData
    }
  ] = await Promise.all([
    import("./modules/core/format.mjs?v=20260729-p218"),
    import("./modules/core/math.mjs?v=20260729-p218"),
    import("./modules/game/room-data.mjs?v=20260729-p218"),
    import("./modules/game/effect-budget.mjs?v=20260729-p218"),
    import("./modules/game/audio-cues.mjs?v=20260729-p218"),
    import("./modules/systems/storage.mjs?v=20260729-p218"),
    import("./modules/systems/input.mjs?v=20260729-p218"),
    import("./modules/training/state.mjs?v=20260729-p218"),
    import("./modules/training/replay.mjs?v=20260729-p218"),
    import("./modules/ui/presentation.mjs?v=20260729-p218")
  ]);

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const stage = canvas.closest(".stage");
  const shell = stage.closest(".shell");
  const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  let prefersReducedMotion = Boolean(reducedMotionQuery?.matches);
  const gameHud = document.getElementById("gameHud");
  const touchControls = document.getElementById("touchControls");
  const touchRecallButton = document.querySelector('[data-touch="recall"]');
  const startButton = document.getElementById("startButton");
  const startPanel = document.getElementById("startPanel");
  const entryGate = document.getElementById("entryGate");
  const guestEntryButton = document.getElementById("guestEntryButton");
  const accountEntryButton = document.getElementById("accountEntryButton");
  const openTrainingButton = document.getElementById("openTrainingButton");
  const startSettingsButton = document.getElementById("startSettingsButton");
  const startAccountButton = document.getElementById("startAccountButton");
  const resumeTrainingButton = document.getElementById("resumeTrainingButton");
  const startReadiness = document.getElementById("startReadiness");
  const loadStatus = document.getElementById("loadStatus");
  const bootFallback = document.getElementById("bootFallback");
  const overlay = document.getElementById("overlay");
  const lumenCount = document.getElementById("lumenCount");
  const roomCount = document.getElementById("roomCount");
  const portraitChapter = document.getElementById("portraitChapter");
  const portraitRoomTitle = document.getElementById("portraitRoomTitle");
  const portraitRoomGoal = document.getElementById("portraitRoomGoal");
  const splitTimeText = document.getElementById("splitTime");
  const splitDeltaText = document.getElementById("splitDelta");
  const flowCountText = document.getElementById("flowCount");
  const runTimeText = document.getElementById("runTime");
  const deathCountText = document.getElementById("deathCount");
  const debugPanel = document.getElementById("debugPanel");
  const gameTip = document.getElementById("gameTip");
  const gameTipTitle = document.getElementById("gameTipTitle");
  const gameTipDetail = document.getElementById("gameTipDetail");
  const settingsButton = document.getElementById("settingsButton");
  const practiceButton = document.getElementById("practiceButton");
  const settingsBackdrop = document.getElementById("settingsBackdrop");
  const settingsPanel = document.getElementById("settingsPanel");
  const settingsCloseButton = document.getElementById("settingsClose");
  const panelTitle = document.getElementById("panelTitle");
  const shakeSlider = document.getElementById("shakeSlider");
  const debugToggle = document.getElementById("debugToggle");
  const calmEffectsToggle = document.getElementById("calmEffectsToggle");
  const lowPerformanceToggle = document.getElementById("lowPerformanceToggle");
  const practiceLinesToggle = document.getElementById("practiceLinesToggle");
  const ghostOpacitySlider = document.getElementById("ghostOpacitySlider");
  const assistModeSelect = document.getElementById("assistMode");
  const audioToggle = document.getElementById("audioToggle");
  const audioVolumeSlider = document.getElementById("audioVolumeSlider");
  const audioTestButton = document.getElementById("audioTestButton");
  const feedbackTypeSelect = document.getElementById("feedbackType");
  const feedbackNoteInput = document.getElementById("feedbackNote");
  const diagnosticsButton = document.getElementById("diagnosticsButton");
  const feedbackTemplateButton = document.getElementById("feedbackTemplateButton");
  const controlPresetSelect = document.getElementById("controlPreset");
  const keyboardLayoutSelect = document.getElementById("keyboardLayout");
  const controlProfileNote = document.getElementById("controlProfileNote");
  const keyBindingEditor = document.getElementById("keyBindingEditor");
  const keyBindingStatus = document.getElementById("keyBindingStatus");
  const resetKeyBindingsButton = document.getElementById("resetKeyBindings");
  const grabModeSelect = document.getElementById("grabMode");
  const gamepadDeadzoneSlider = document.getElementById("gamepadDeadzoneSlider");
  const gamepadStatusOutput = document.getElementById("gamepadStatus");
  const touchSizeSlider = document.getElementById("touchSizeSlider");
  const accountGroup = document.querySelector(".settings-group-account");
  const accountSummary = document.getElementById("accountSummary");
  const accountGuest = document.getElementById("accountGuest");
  const accountUserPanel = document.getElementById("accountUser");
  const accountAuthTabs = document.getElementById("accountAuthTabs");
  const accountEmailField = document.getElementById("accountEmailField");
  const accountEmailInput = document.getElementById("accountEmail");
  const accountPasswordInput = document.getElementById("accountPassword");
  const accountPasswordField = document.getElementById("accountPasswordField");
  const accountPasswordLabel = document.getElementById("accountPasswordLabel");
  const accountRecoveryButton = document.getElementById("accountRecovery");
  const accountCodeFields = document.getElementById("accountCodeFields");
  const accountCodeInput = document.getElementById("accountCode");
  const accountSendCodeButton = document.getElementById("accountSendCode");
  const accountSubmitButton = document.getElementById("accountSubmit");
  const accountNote = document.getElementById("accountNote");
  const accountEmailLabel = document.getElementById("accountEmailLabel");
  const accountAvatar = document.getElementById("accountAvatar");
  const accountNewPasswordInput = document.getElementById("accountNewPassword");
  const accountOldPasswordInput = document.getElementById("accountOldPassword");
  const accountSetPasswordButton = document.getElementById("accountSetPassword");
  const accountLogoutButton = document.getElementById("accountLogout");
  const accountStatus = document.getElementById("accountStatus");
  const cloudSyncStatus = document.getElementById("cloudSyncStatus");
  const cloudUploadButton = document.getElementById("cloudUploadButton");
  const cloudDownloadButton = document.getElementById("cloudDownloadButton");
  const saveExportButton = document.getElementById("saveExportButton");
  const saveDownloadButton = document.getElementById("saveDownloadButton");
  const saveImportButton = document.getElementById("saveImportButton");
  const saveRestoreButton = document.getElementById("saveRestoreButton");
  const saveImportText = document.getElementById("saveImportText");
  const saveImportStatus = document.getElementById("saveImportStatus");
  const saveBackupStatus = document.getElementById("saveBackupStatus");
  const roomSelect = document.getElementById("roomSelect");
  const roomBrief = document.getElementById("roomBrief");
  const chapterOverview = document.getElementById("chapterOverview");
  const practicePlan = document.getElementById("practicePlan");
  const routeContracts = document.getElementById("routeContracts");
  const feelLab = document.getElementById("feelLab");
  const focusRoomButton = document.getElementById("focusRoomButton");
  const focusResetButton = document.getElementById("focusResetButton");
  const practiceReport = document.getElementById("practiceReport");
  const practiceQueue = document.getElementById("practiceQueue");
  const challengeBoard = document.getElementById("challengeBoard");
  const profileSummary = document.getElementById("profileSummary");
  const practiceLedger = document.getElementById("practiceLedger");
  const drillCleanButton = document.getElementById("drillCleanButton");
  const drillPaceButton = document.getElementById("drillPaceButton");
  const drillStyleButton = document.getElementById("drillStyleButton");
  const drillExpertButton = document.getElementById("drillExpertButton");
  const gameStatus = document.getElementById("gameStatus");
  const dashMeter = document.querySelector(".dash-meter");
  const dashFill = document.querySelector(".dash-meter span");
  const staminaMeter = document.querySelector(".stamina-meter");
  const staminaFill = document.querySelector(".stamina-meter span");
  const paceMeter = document.querySelector(".pace-meter");
  const paceFill = document.querySelector(".pace-meter span");

  const LOGICAL_W = 960;
  const LOGICAL_H = 544;
  const W = LOGICAL_W;
  const H = LOGICAL_H;
  const TILE = 32;
  const COLS = 30;
  const ROWS = 17;
  const GRAVITY = 1700;
  const MAX_FALL = 760;
  const MOVE_SPEED = 240;
  const ACCEL = 5200;
  const AIR_ACCEL = 3700;
  const TURN_ACCEL = 7600;
  const FRICTION = 5600;
  const JUMP = 515;
  const WALL_JUMP_X = 330;
  const DASH_SPEED = 585;
  const DASH_TIME = 0.135;
  const MAX_STAMINA = 1;
  const COYOTE_TIME = 0.12;
  const JUMP_BUFFER_TIME = 0.13;
  const DASH_BUFFER_TIME = 0.13;
  const DASH_AIM_MEMORY = 0.085;
  const SPARK_HOP_WINDOW = 0.11;
  const SPARK_HOP_X = 345;
  const SPARK_HOP_Y = 430;
  const WALL_SPARK_X_MULT = 1.08;
  const PRISM_SPARK_MULT = 1.12;
  const CORNER_CORRECTION = 6;
  const DASH_CORNER_CORRECTION = 5;
  const WALL_NEUTRAL_X = 230;
  const WALL_CLIMB_X = 170;
  const WALL_JUMP_LOCK_TIME = 0.09;
  const WALL_COYOTE_TIME = 0.12;
  const FAST_FALL_MAX = 900;
  const FAST_FALL_GRAVITY_MULT = 1.42;
  const APEX_WINDOW_SPEED = 62;
  const APEX_GRAVITY_MULT = 0.68;
  const UPDRAFT_FORCE = 2150;
  const UPDRAFT_RISE_SPEED = 500;
  const PRISM_RESET_TIME = 4.8;
  const OVERDRIVE_TIME = 1.05;
  const OVERDRIVE_DASH_MULT = 1.12;
  const OVERDRIVE_RUN_MULT = 1.1;
  const JUMP_CUT_MULTIPLIER = 0.56;
  const DEATH_RETRY_TIME = 0.22;
  const DASH_HITSTOP = 0.018;
  const DEATH_HITSTOP = 0.035;
  const SHAKE_INTENSITY = 0;
  const LIGHT_TRAIL_LIFE = 0.26;
  const LIGHT_TRAIL_WIDTH = 24;
  const LIGHT_TRAIL_HEIGHT = 2;
  const LIGHT_TRAIL_STEP = 11;
  const RELAY_RESET_TIME = 4.2;
  const RELAY_TRIGGER_SPEED = 390;
  const RELAY_CHAIN_TIME = 1.35;
  const BEST_TIME_KEY = "summit-spark-best-time";
  const ROOM_BESTS_KEY = "summit-spark-room-bests";
  const ROOM_PATHS_KEY = "summit-spark-room-paths";
  const ROOM_FOCUS_KEY = "summit-spark-room-focus";
  const PROFILE_KEY = "summit-spark-profile";
  const PATH_SAMPLE_INTERVAL = 0.045;
  const RECENT_PATH_SECONDS = 1.55;
  const MAX_ROOM_PATH_POINTS = 420;
  const SPLIT_POPUP_TIME = 1.25;
  const FOCUS_POPUP_TIME = 1.35;
  const GAME_TIP_TIME = 4.8;
  const FOCUS_RESET_CONFIRM_MS = 2200;
  const FEEL_CUE_TIME = 0.72;
  const ROUTE_CUE_TIME = 3.8;
  const MASTERY_POPUP_TIME = 1.8;
  const SETTINGS_KEY = "summit-spark-settings";
  const SETTINGS_SCHEMA_VERSION = 4;
  const PROFILE_SCHEMA_VERSION = 2;
  const ROOM_FOCUS_SCHEMA_VERSION = 2;
  const SAVE_ARCHIVE_SCHEMA_VERSION = 1;
  const SAVE_ARCHIVE_KIND = "summit-spark-save";
  const SAVE_BACKUP_KEY = "summit-spark-save-backup";
  const SAVE_ARCHIVE_MAX_CHARS = 1000000;
  const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
  const APPWRITE_PROJECT_ID = "summit-spark";
  const APPWRITE_DATABASE_ID = "summit-spark";
  const APPWRITE_SAVES_TABLE_ID = "saves";
  const CLOUD_SYNC_DELAY_MS = 1800;
  const ACCOUNT_RESTORE_TIMEOUT_MS = 6500;
  const ENTRY_MODE_SESSION_KEY = "summit-spark-entry-mode";
  const ACCOUNT_HINT_STORAGE_KEY = "summit-spark-account-hint";
  const ACCOUNT_OTP_SESSION_KEY = "summit-spark-otp-user";
  const ACCOUNT_OTP_EMAIL_SESSION_KEY = "summit-spark-otp-email";
  const ACTION_PULSE_TIME = 0.22;
  const BEST_FLOW_KEY = "summit-spark-best-flow";
  const FLOW_DECAY_TIME = 1.9;
  const FLOW_DECAY_RATE = 38;
  const NEAR_MISS_COOLDOWN = 0.48;
  const ECHO_RECALL_COOLDOWN = 0.32;
  const ROOM_INTRO_TIME = 1.2;
  const ECHO_LESSON_TIME = 3.2;
  const CHAPTER_TRANSITION_TIME = 1.8;
  const SUMMIT_REVEAL_TIME = 2.25;
  const CURRENT_PATH_DRAW_POINTS = 90;
  const CRUMBLE_BREAK_TIME = 0.42;
  const DASH_AIM_PREVIEW_LENGTH = 58;
  const DASH_AIM_PREVIEW_MIN_ALPHA = 0.24;
  const CRUMBLE_DEATH_MEMORY = 1.4;
  const DEATH_REASON_KEYS = ["spike", "fall", "crumble", "retry", "room"];
  const DEATH_REASON_LABELS = {
    spike: "尖刺",
    fall: "坠落",
    crumble: "碎冰",
    retry: "重开",
    room: "换房"
  };
  const GAME_TIP_CLASSES = ["death", "storage"];
  const FLOW_CHALLENGE_TARGET = 900;
  const GAMEPAD_DEADZONE_DEFAULT = 0.28;
  const GAMEPAD_DEADZONE_MIN = 0.12;
  const GAMEPAD_DEADZONE_MAX = 0.45;
  const TOUCH_SIZE_DEFAULT = 48;
  const TOUCH_SIZE_MIN = 44;
  const TOUCH_SIZE_MAX = 64;
  const CANVAS_BUFFER_SCALE_MAX = 2.6;
  const CANVAS_BUFFER_SCALE_STEP = 0.05;

  const SOLID = new Set(["#", "C"]);
  const HAZARDS = new Set(["^", "v", "<", ">"]);
  const CONTROL_PRESETS = Object.freeze({
    comfort: Object.freeze({
      pc: Object.freeze({
        left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS",
        jump: "Space", dash: "KeyK", grab: "KeyJ",
        recall: "KeyQ", retry: "KeyR", roomRestart: "KeyT"
      }),
      mac: Object.freeze({
        left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS",
        jump: "Space", dash: "KeyK", grab: "KeyJ",
        recall: "KeyQ", retry: "KeyR", roomRestart: "KeyT"
      })
    }),
    classic: Object.freeze({
      pc: Object.freeze({
        left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown",
        jump: "KeyC", dash: "KeyX", grab: "KeyZ",
        recall: "KeyQ", retry: "KeyR", roomRestart: "KeyT"
      }),
      mac: Object.freeze({
        left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown",
        jump: "KeyC", dash: "KeyX", grab: "KeyZ",
        recall: "KeyQ", retry: "KeyR", roomRestart: "KeyT"
      })
    })
  });
  const KEYBOARD_LAYOUT_DEFAULTS = Object.freeze({
    pc: Object.freeze({
      left: "KeyA",
      right: "KeyD",
      up: "KeyW",
      down: "KeyS",
      jump: "Space",
      dash: "ShiftLeft",
      grab: "KeyZ",
      recall: "KeyQ",
      retry: "KeyR",
      roomRestart: "KeyT"
    }),
    mac: Object.freeze({
      left: "ArrowLeft",
      right: "ArrowRight",
      up: "ArrowUp",
      down: "ArrowDown",
      jump: "Space",
      dash: "ShiftLeft",
      grab: "KeyC",
      recall: "KeyQ",
      retry: "KeyR",
      roomRestart: "KeyT"
    })
  });
  const BINDING_ACTIONS = Object.freeze(["left", "right", "up", "down", "jump", "dash", "grab", "recall", "retry", "roomRestart"]);
  const BINDING_LABELS = Object.freeze({
    left: "向左",
    right: "向右",
    up: "向上",
    down: "向下",
    jump: "跳跃",
    dash: "冲刺",
    grab: "抓墙",
    recall: "召回",
    retry: "快速重开",
    roomRestart: "重开房间"
  });
  const RESERVED_BINDING_CODES = new Set(["Escape", "Tab", "Enter", "KeyO", "KeyP", "F3"]);
  const ALL_ACTION_CODES = new Set(Object.values(CONTROL_PRESETS).flatMap((preset) =>
    Object.values(preset).flatMap((bindings) => [bindings.jump, bindings.dash, bindings.grab])
  ));
  const BLOCKED_CODES = new Set([
    ...ALL_ACTION_CODES,
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Enter",
    "KeyR",
    "KeyT",
    "KeyQ",
    "Backspace",
    "KeyO",
    "F3"
  ]);

  const ASSIST_SPEED = 0.85;
  const LONG_TERM_CHALLENGES = [
    { id: "clear", label: "首登顶", goal: "完成一次完整路线", kind: "run", mode: "clean" },
    { id: "clean", label: "全 Clean", goal: "每房至少一次无失误", kind: "clean", mode: "clean" },
    { id: "pace", label: "全 S", goal: "每房 PB 达到 S 节奏", kind: "pace", mode: "pace" },
    { id: "style", label: "全 Style", goal: "每房完成类型挑战", kind: "style", mode: "style" },
    { id: "expert", label: "全 Expert", goal: "每房证明高手线", kind: "expert", mode: "expert" },
    { id: "nodeath", label: "零失误登顶", goal: "完整通关且失误数为 0", kind: "nodeath", mode: "clean" },
    { id: "flow", label: "Flow 峰值", goal: `本轮 Flow 达到 ${FLOW_CHALLENGE_TARGET}`, kind: "flow", mode: "pace" }
  ];
  const ROUTE_CONTRACTS = [
    {
      id: "stable",
      label: "稳定航线",
      goal: "先补无失误，再处理地形压力",
      steps: [{ index: 1, mode: "clean" }, { index: 4, mode: "clean" }, { index: 6, mode: "style" }]
    },
    {
      id: "tempo",
      label: "节奏航线",
      goal: "弹簧、光继和棱镜连成速度句子",
      steps: [{ index: 2, mode: "pace" }, { index: 5, mode: "pace" }, { index: 7, mode: "style" }]
    },
    {
      id: "summit",
      label: "高手航线",
      goal: "把类型动作推进到终盘 Expert",
      steps: [{ index: 3, mode: "style" }, { index: 8, mode: "expert" }, { index: 9, mode: "expert" }]
    }
  ];
  const FEEL_REPLAY_FIXTURES = [
    { id: "jump-buffer", room: 1, window: "JUMP_BUFFER_TIME", maxDelay: 0.095, expected: ["jump"], note: "提前按跳必须接住落地" },
    { id: "coyote-jump", room: 1, window: "COYOTE_TIME", maxDelay: 0.085, expected: ["jump"], note: "离地后短时间仍能起跳" },
    { id: "wall-grace", room: 4, window: "WALL_COYOTE_TIME", maxDelay: 0.082, expected: ["wall"], note: "离墙后仍能墙跳容错" },
    { id: "aim-memory-dash", room: 2, window: "DASH_AIM_MEMORY", maxDelay: 0.07, expected: ["dash"], note: "松方向后保留上一冲刺意图" },
    { id: "spark-hop", room: 1, window: "SPARK_HOP_WINDOW", maxDelay: 0.09, expected: ["spark"], note: "dash 后续跃窗口是核心手感" },
    { id: "wall-spark", room: 5, window: "SPARK_HOP_WINDOW", maxDelay: 0.085, expected: ["wallSpark"], note: "贴墙续跃形成折返高手线" },
    { id: "prism-spark", room: 8, window: "SPARK_HOP_WINDOW", maxDelay: 0.085, expected: ["prismSpark"], note: "棱镜后续跃形成过载路线" }
  ];
  const palette = {
    skyTop: "#273b59",
    skyMid: "#5b7084",
    skyLow: "#b4917f",
    rock: "#455f74",
    rockDark: "#30465b",
    rockLight: "#8298a8",
    snow: "#eaf4f4",
    hot: "#ef6f78",
    gold: "#f4c66d",
    green: "#91d7a5",
    cyan: "#7fc4d7",
    ink: "#f4f2ea"
  };
  const CANVAS_PANEL_BG = "rgba(211,224,216,0.74)";
  const CANVAS_PANEL_STROKE = "rgba(60,88,96,0.18)";
  const CANVAS_PANEL_INK = "rgba(36,58,68,0.9)";
  const CANVAS_PANEL_MUTED = "rgba(48,72,80,0.68)";
  const cachedRockTiles = new Map();
  const cachedCrumbleTiles = new Map();

  function assertMaps() {
    maps.forEach((room, roomIndex) => {
      if (room.length !== ROWS) {
        throw new Error(`Room ${roomIndex} must have ${ROWS} rows.`);
      }
      room.forEach((row, rowIndex) => {
        if (row.length !== COLS) {
          throw new Error(`Room ${roomIndex} row ${rowIndex} has ${row.length} columns.`);
        }
      });
    });
  }

  assertMaps();

  const keys = new Set();
  const pressed = new Set();
  const touchPressed = new Set();
  const gamepadPressed = new Set();
  const gamepadHeld = new Set();
  const gamepadInput = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    dash: false,
    grab: false,
    recall: false
  };
  let lastGamepadStatusText = "";
  let lastGamepadStatus = {
    supported: false,
    connected: false,
    count: 0,
    standardMapping: 0,
    axisX: 0,
    axisY: 0,
    axisMagnitude: 0,
    driftRisk: false,
    activeActions: []
  };
  const touch = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    dash: false,
    grab: false
  };

  const particles = [];
  const shards = [];
  const ghosts = [];
  const lightTrails = [];
  const recentPath = [];
  const roomPath = [];
  let roomIndex = 0;
  let room = null;
  let started = false;
  let won = false;
  let summitRevealTimer = 0;
  let pendingSummitResult = null;
  let summitChapterResult = null;
  let lastTime = performance.now();
  let deathCount = 0;
  let deathReasons = createDeathReasons();
  let roomMistakes = createRoomCounters();
  let runRoomTimes = createRoomCounters();
  let roomFocus = readRoomFocus();
  let roomAttemptClean = true;
  let runUsedAssist = false;
  let lastDeathReason = "none";
  let crumbleSlipTimer = 0;
  let runTime = 0;
  let roomTime = 0;
  let bestTime = readBestTime();
  let bestRoomTimes = readRoomBests();
  let bestRoomPaths = readRoomPaths();
  let bestFlow = readBestFlow();
  let profile = readProfile();
  let collected = new Set();
  let debugVisible = false;
  let hitStopTimer = 0;
  let shakeTimer = 0;
  let shakeDuration = 0;
  let shakePower = 0;
  let fps = 60;
  let settingsVisible = false;
  let focusPaused = false;
  let panelMode = "settings";
  let panelReturnFocus = null;
  let grabLatched = false;
  let lastGrabHeld = false;
  let lastAimX = 1;
  let lastAimY = 0;
  let lastAimTimer = 0;
  let pathSampleTimer = 0;
  let relayChain = 0;
  let relayChainTimer = 0;
  let bestRelayChain = 0;
  let splitPopupTimer = 0;
  let splitPopupText = "";
  let splitPopupAhead = true;
  let feelCueTimer = 0;
  let feelCueMax = FEEL_CUE_TIME;
  let feelCueText = "";
  let feelCueDetail = "";
  let feelCueColor = palette.cyan;
  const mechanicFirstTouchSeen = Object.create(null);
  let routeCueTimer = 0;
  let routeCueSlot = 0;
  let routeCueReason = "入场";
  let masteryPopupTimer = 0;
  let masteryPopupText = "";
  let masteryPopupDetail = "";
  let focusPopupTimer = 0;
  let focusPopupText = "";
  let focusPopupDetail = "";
  let gameTipTimer = 0;
  let gameTipMax = GAME_TIP_TIME;
  let gameTipKind = "";
  let gameTipPriority = 0;
  let lumenReserveExplained = false;
  let focusResetConfirmUntil = 0;
  let focusResetExpiryTimer = 0;
  let lastGameStatus = "";
  let lastChapterOverviewHtml = "";
  let lastPracticePlanHtml = "";
  let lastRouteContractsHtml = "";
  let lastFeelLabHtml = "";
  let lastPracticeQueueHtml = "";
  let lastChallengeBoardHtml = "";
  let lastProfileSummaryHtml = "";
  let lastPracticeLedgerHtml = "";
  let storageHealthMessage = "";
  let storageHealthToastShown = false;
  let authMode = "code";
  let accountFocused = false;
  let entryMode = "";
  let recoveryUserId = "";
  let recoverySecret = "";
  let accountUser = null;
  let accountTokenUserId = "";
  let accountTokenEmail = "";
  let accountSdk = null;
  let accountSdkLoadPromise = null;
  let cloudRow = null;
  let cloudSyncReady = false;
  let cloudSyncBusy = false;
  let cloudInspectionPending = false;
  let cloudRemoteUsable = false;
  let cloudUploadPermitted = false;
  let cloudSyncTimer = 0;
  let cloudSaveDirty = false;
  let cloudSyncFlushRequested = false;
  let cloudSyncRetryBlocked = false;
  let accountSessionGeneration = 0;
  let lastCloudArchiveHash = "";
  let flowScore = 0;
  let flowPeak = 0;
  let flowTimer = 0;
  let nearMissCooldown = 0;
  let echoAnchor = null;
  let recallCooldown = 0;
  let recallPulseTimer = 0;
  let echoLessonTimer = 0;
  let echoLessonShown = false;
  let roomIntroTimer = ROOM_INTRO_TIME;
  let chapterTransitionTimer = 0;
  let chapterTransitionChapter = 0;
  let chapterTransitionFromChapter = -1;
  let chapterTransitionFromResult = null;
  let activeDrill = null;
  let activeChallenge = null;
  let activeRouteContract = null;
  let lastRouteContractResult = null;
  let routeContractGeneration = 0;
  let routeContractStepTimer = 0;
  let activeFeelFixture = null;
  let lastFeelFixtureResult = null;
  let audioContext = null;
  let audioMaster = null;
  let ambientBus = null;
  let ambientNextTime = 0;
  let ambientStep = 0;
  const ambientVoices = new Map();
  const soundCooldowns = {};
  let timingArmed = false;
  let timingInputReady = false;
  let roomTech = createRoomTech();
  const settings = readSettings();
  let pendingBindingAction = "";
  let bindingCaptureSnapshot = null;
  const actionPulse = {
    jump: 0,
    dash: 0,
    grab: 0,
    fall: 0,
    wall: 0,
    apex: 0
  };
  const actionVisual = {
    land: 0,
    jump: 0,
    dash: 0,
    spark: 0,
    wall: 0,
    relay: 0,
    prism: 0,
    spring: 0,
    recall: 0,
    spawn: 0,
    death: 0
  };
  const totalLumens = maps.reduce((total, rows) => {
    return total + rows.join("").split("").filter((tile) => tile === "L").length;
  }, 0);

  const player = {
    x: 0,
    y: 0,
    w: 19,
    h: 25,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    wasGrounded: false,
    wallDir: 0,
    wallCoyote: 0,
    wallCoyoteDir: 0,
    overdrive: 0,
    stamina: MAX_STAMINA,
    dashes: 1,
    lumenReserve: false,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 1,
    dashDirY: 0,
    ghostTimer: 0,
    coyote: 0,
    jumpBuffer: 0,
    dashBuffer: 0,
    sparkHopTimer: 0,
    sparkHopDirX: 1,
    sparkHopDirY: 0,
    sparkHopVariant: "spark",
    wallJumpLock: 0,
    deadTimer: 0,
    respawnRoom: 0,
    respawnX: 0,
    respawnY: 0,
    hair: []
  };

  resetToStart(0);
  seedHair();
  syncComfortSettings();
  updateHud();
  refreshStartOverlay();

  window.addEventListener("keydown", (event) => {
    const uiControl = isSettingsInputTarget(event.target);
    const textEntry = isSettingsTextEntryTarget(event.target);
    if (pendingBindingAction) {
      event.preventDefault();
      event.stopPropagation();
      captureKeyBinding(event.code);
      return;
    }
    if (finishDialogVisible() && event.code === "Tab") {
      trapFinishFocus(event);
      return;
    }
    if (settingsVisible && event.code === "Tab") {
      trapPanelFocus(event);
      return;
    }
    if (settingsVisible && event.code === "Escape") {
      event.preventDefault();
      if (event.repeat) return;
      closeSettings();
      return;
    }
    if (textEntry) return;
    if (settingsVisible && event.code !== "KeyO" && event.code !== "KeyP" && event.code !== "F3") {
      return;
    }
    if (uiControl && event.code !== "KeyO" && event.code !== "KeyP" && event.code !== "F3") return;
    if (shouldBlockKey(event.code)) {
      event.preventDefault();
    }
    const firstPress = pressInput(keys, pressed, event.code);
    if (firstPress) {
      queueAction(event.code);
    }
    if (event.code === "F3" && firstPress) {
      toggleDebug();
    }
    if (event.code === "KeyO" && firstPress) {
      toggleSettings();
    }
    if (event.code === "KeyP" && firstPress) {
      togglePracticePanel();
    }
    if (!started && isStartCode(event.code)) {
      begin();
    }
    if (isActionCode(event.code, "retry") && firstPress && started) {
      if (won) {
        hardReset();
      } else {
        quickRetry();
      }
    } else if (won && isActionCode(event.code, "retry")) {
      hardReset();
    }
    if (isActionCode(event.code, "roomRestart") && firstPress && started && !won) {
      restartCurrentRoom();
    }
    if (isActionCode(event.code, "recall") && firstPress && started && !won) {
      recallToAnchor();
    }
    if (debugVisible && firstPress && event.code.startsWith("Digit")) {
      const digit = Number(event.code.slice(5));
      const target = digit === 0 ? 9 : digit - 1;
      if (target >= 0 && target < maps.length) jumpToRoom(target);
    }
    if (debugVisible && firstPress && event.code === "KeyH" && started && !won && roomIndex === maps.length - 1) {
      beginSummitReveal({ isBest: false, assisted: runUsedAssist, drillResult: null });
    }
  });

  window.addEventListener("keyup", (event) => {
    if (isSettingsInputTarget(event.target)) return;
    releaseInput(keys, event.code);
    if (isActionCode(event.code, "jump")) cutJump();
  });

  window.addEventListener("blur", () => {
    if (started && !won) focusPaused = true;
    releaseAllInputs();
  });

  window.addEventListener("focus", () => {
    focusPaused = false;
    lastTime = performance.now();
  });

  document.addEventListener("visibilitychange", () => {
    focusPaused = document.hidden && started && !won;
    releaseAllInputs();
    if (document.hidden) flushPendingCloudSave();
    if (!document.hidden) lastTime = performance.now();
  });

  window.addEventListener("pagehide", flushPendingCloudSave);

  function isSettingsInputTarget(target) {
    return settingsVisible
      && typeof Element !== "undefined"
      && target instanceof Element
      && settingsPanel?.contains(target)
      && ["INPUT", "SELECT", "BUTTON", "TEXTAREA"].includes(target.tagName);
  }

  function isSettingsTextEntryTarget(target) {
    if (!isSettingsInputTarget(target)) return false;
    if (target.tagName === "TEXTAREA") return true;
    if (target.tagName !== "INPUT") return false;
    const type = String(target.getAttribute("type") || "text").toLowerCase();
    return !["checkbox", "range", "radio", "button", "submit", "reset"].includes(type);
  }

  function panelFocusableElements() {
    if (!settingsPanel) return [];
    return focusableElementsWithin(settingsPanel);
  }

  function focusableElementsWithin(root) {
    if (!(root instanceof Element)) return [];
    return Array.from(root.querySelectorAll("button, select, input, textarea, summary, [tabindex]"))
      .filter((element) => !element.hasAttribute("disabled")
        && element.getAttribute("tabindex") !== "-1"
        && element.getAttribute("aria-hidden") !== "true"
        && element.getClientRects().length > 0);
  }

  function trapPanelFocus(event) {
    const focusable = panelFocusableElements();
    if (!focusable.length) {
      event.preventDefault();
      settingsCloseButton?.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || !settingsPanel.contains(current))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (current === last || !settingsPanel.contains(current))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function finishDialogVisible() {
    return !settingsVisible
      && overlay.classList.contains("finish-overlay")
      && !overlay.classList.contains("hidden")
      && !overlay.hidden;
  }

  function trapFinishFocus(event) {
    const focusable = focusableElementsWithin(overlay);
    if (!focusable.length) {
      event.preventDefault();
      document.getElementById("finishTitle")?.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || !overlay.contains(current))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (current === last || !overlay.contains(current))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function canvasBufferScale() {
    if (settings.lowPerformance) return 1;
    const rect = canvas.getBoundingClientRect();
    const cssScale = Math.max(rect.width / W, rect.height / H);
    const desired = cssScale * Math.max(1, window.devicePixelRatio || 1);
    const roundedUp = Math.ceil(desired / CANVAS_BUFFER_SCALE_STEP) * CANVAS_BUFFER_SCALE_STEP;
    return Math.max(1, Math.min(CANVAS_BUFFER_SCALE_MAX, roundedUp));
  }

  function configureCanvasBuffer() {
    const scale = canvasBufferScale();
    const width = Math.round(W * scale);
    const height = Math.round(H * scale);
    if (canvas.width !== width || canvas.height !== height) {
      cachedRockTiles.clear();
      cachedCrumbleTiles.clear();
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function markAppReady() {
    document.documentElement.classList.add("app-ready");
    if (bootFallback) bootFallback.setAttribute("aria-hidden", "true");
    maybeShowStorageRepairToast();
  }

  function maybeShowStorageRepairToast() {
    if (storageHealthToastShown || !storageHealthMessage) return;
    storageHealthToastShown = true;
    setGameStatus(storageHealthMessage);
    const repaired = storageHealthMessage.includes("修复");
    showGameTip(storageHealthMessage, repaired ? "已忽略损坏字段，训练档案可继续使用" : "本次游玩可继续，但进度可能无法写入", "storage", GAME_TIP_TIME, 4);
  }

  function releaseAllInputs() {
    releaseInputState({
      heldSets: [keys, gamepadHeld],
      pressedSets: [pressed, touchPressed, gamepadPressed],
      digitalStates: [touch, gamepadInput]
    });
    clearGrabToggle();
    document.querySelectorAll("[data-touch]").forEach((button) => button.classList.remove("active"));
    clearInputBuffers(player);
    resetActionPulses();
  }

  canvas.addEventListener("pointerdown", focusGame);
  const syncReducedMotionPreference = (event = reducedMotionQuery) => {
    prefersReducedMotion = Boolean(event?.matches);
    stage?.classList.toggle("reduced-motion", prefersReducedMotion);
  };
  reducedMotionQuery?.addEventListener?.("change", syncReducedMotionPreference);
  syncReducedMotionPreference();
  configureCanvasBuffer();
  window.addEventListener("resize", configureCanvasBuffer);
  startButton.addEventListener("click", begin);
  guestEntryButton?.addEventListener("click", () => resolveEntryMode("guest"));
  accountEntryButton?.addEventListener("click", openAccountPanel);
  openTrainingButton?.addEventListener("click", openStartTrainingPanel);
  startSettingsButton?.addEventListener("click", openSettingsPanel);
  startAccountButton?.addEventListener("click", openAccountPanel);
  resumeTrainingButton?.addEventListener("click", resumeRecommendedTraining);
  if (new URLSearchParams(window.location.search).has("play")) {
    requestAnimationFrame(begin);
  }
  settingsButton?.addEventListener("click", toggleSettings);
  practiceButton?.addEventListener("click", togglePracticePanel);
  overlay.addEventListener("toggle", (event) => {
    const details = event.target instanceof HTMLDetailsElement && event.target.matches(".review-more")
      ? event.target
      : null;
    if (details) syncReviewDisclosure(details);
  }, true);
  overlay.addEventListener("click", (event) => {
    const restart = event.target instanceof Element ? event.target.closest("#restartButton") : null;
    if (restart && overlay.contains(restart)) hardReset();
  });
  document.addEventListener("pointerdown", closeSettingsFromOutside, true);
  settingsBackdrop?.addEventListener("click", closeSettingsFromBackdrop);
  settingsCloseButton?.addEventListener("click", closeSettings);
  settingsCloseButton?.addEventListener("pointerup", closeSettingsFromTouch);
  settingsCloseButton?.addEventListener("touchend", closeSettingsFromTouch);
  shakeSlider?.addEventListener("input", () => {
    settings.shake = Number(shakeSlider.value);
    writeSettings();
  });
  debugToggle?.addEventListener("change", () => setDebugVisible(debugToggle.checked));
  calmEffectsToggle?.addEventListener("change", () => {
    settings.calmEffects = calmEffectsToggle.checked;
    writeSettings();
  });
  lowPerformanceToggle?.addEventListener("change", () => {
    settings.lowPerformance = lowPerformanceToggle.checked;
    syncComfortSettings();
    configureCanvasBuffer();
    writeSettings();
    setGameStatus(settings.lowPerformance ? "低性能模式已开启" : "低性能模式已关闭");
  });
  practiceLinesToggle?.addEventListener("change", () => {
    settings.practiceLines = practiceLinesToggle.checked;
    writeSettings();
  });
  ghostOpacitySlider?.addEventListener("input", () => {
    settings.ghostOpacity = Number(ghostOpacitySlider.value);
    writeSettings();
  });
  assistModeSelect?.addEventListener("change", () => {
    settings.assistMode = assistModeSelect.value === "gentle" ? "gentle" : "off";
    if (assistActive()) {
      runUsedAssist = true;
      player.stamina = MAX_STAMINA;
      restoreDashCharge();
      activeChallenge = null;
    }
    syncComfortSettings();
    writeSettings();
    setGameStatus(assistActive() ? "舒缓辅助：85% 速度、双冲刺、无限体力；本轮不计纪录" : "辅助已关闭；重新开始后恢复纪录");
  });
  audioToggle?.addEventListener("change", () => {
    settings.audioEnabled = audioToggle.checked;
    writeSettings();
    if (settings.audioEnabled) {
      unlockAudio();
      playSound("ui");
    }
    setGameStatus(settings.audioEnabled ? "声音已开启" : "声音已关闭");
  });
  audioVolumeSlider?.addEventListener("input", () => {
    settings.audioVolume = Number(audioVolumeSlider.value);
    writeSettings();
    playSound("ui");
  });
  audioTestButton?.addEventListener("click", () => {
    settings.audioEnabled = true;
    if (audioToggle) audioToggle.checked = true;
    writeSettings();
    playAudioTestPattern();
    setGameStatus("声音试听：输入、Spark、清房");
    focusGame();
  });
  document.querySelectorAll(".settings-group").forEach((group) => {
    syncSettingsGroupDisclosure(group);
    group.addEventListener("toggle", () => syncSettingsGroupDisclosure(group));
  });
  document.querySelectorAll(".settings-group.settings-only").forEach((group) => {
    group.addEventListener("toggle", () => {
      if (!group.open || panelMode !== "settings") return;
      document.querySelectorAll(".settings-group.settings-only").forEach((other) => {
        if (other === group) return;
        other.open = false;
        syncSettingsGroupDisclosure(other);
      });
    });
  });
  diagnosticsButton?.addEventListener("click", () => {
    copyDiagnosticsSnapshot().catch(() => {
      setGameStatus("诊断导出失败，可继续游玩");
      showGameTip("诊断导出失败", "不影响训练数据，请稍后重试", "death", GAME_TIP_TIME, 3);
    });
  });
  feedbackTemplateButton?.addEventListener("click", () => {
    copyFeedbackTemplate().catch(() => {
      setGameStatus("反馈模板导出失败，可继续游玩");
      showGameTip("反馈模板导出失败", "可先复制诊断 JSON，再补充复现步骤", "death", GAME_TIP_TIME, 3);
    });
  });
  saveExportButton?.addEventListener("click", () => {
    copySaveArchive().catch(() => {
      setGameStatus("存档导出失败，可继续游玩");
      showGameTip("存档导出失败", "本地存档仍保留在浏览器中", "death", GAME_TIP_TIME, 3);
    });
  });
  saveDownloadButton?.addEventListener("click", () => {
    downloadSaveArchiveAction();
  });
  saveImportButton?.addEventListener("click", () => {
    importSaveArchiveFromText();
  });
  saveRestoreButton?.addEventListener("click", () => {
    restoreSaveBackup();
  });
  saveImportText?.addEventListener("input", () => {
    updateSaveImportPreview();
  });
  controlPresetSelect?.addEventListener("change", () => {
    const nextPreset = controlPresetSelect.value;
    settings.controlsPreset = nextPreset === "custom" || CONTROL_PRESETS[nextPreset] ? nextPreset : "comfort";
    releaseAllInputs();
    syncKeyBindingEditor();
    writeSettings();
    setGameStatus(settings.controlsPreset === "custom" ? "已启用自定义键位" : `键位方案：${settings.controlsPreset === "classic" ? "经典" : "舒适"}`);
  });
  keyboardLayoutSelect?.addEventListener("change", () => {
    settings.keyboardLayout = keyboardLayoutSelect.value === "mac" ? "mac" : "pc";
    releaseAllInputs();
    syncKeyBindingEditor();
    writeSettings();
    const preserved = settings.controlsPreset === "custom" ? "，自定义键位保持不变" : "";
    setGameStatus(`${settings.keyboardLayout === "mac" ? "已切换 Mac 键盘标识" : "已切换 Windows / Linux 键盘标识"}${preserved}`);
  });
  document.querySelectorAll("[data-layout-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!keyboardLayoutSelect) return;
      keyboardLayoutSelect.value = button.dataset.layoutChoice === "mac" ? "mac" : "pc";
      keyboardLayoutSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
  document.querySelectorAll("[data-preset-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!controlPresetSelect) return;
      controlPresetSelect.value = button.dataset.presetChoice || "comfort";
      controlPresetSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
  document.querySelectorAll("[data-grab-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!grabModeSelect) return;
      grabModeSelect.value = button.dataset.grabChoice === "toggle" ? "toggle" : "hold";
      grabModeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
  keyBindingEditor?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-binding-action]");
    if (!(button instanceof HTMLButtonElement)) return;
    beginKeyBindingCapture(button.dataset.bindingAction || "");
  });
  resetKeyBindingsButton?.addEventListener("click", () => {
    settings.customBindings = defaultBindingsForLayout(settings.keyboardLayout);
    settings.controlsPreset = "custom";
    pendingBindingAction = "";
    bindingCaptureSnapshot = null;
    releaseAllInputs();
    syncKeyBindingEditor();
    writeSettings();
    setGameStatus("已恢复当前键盘布局");
  });
  grabModeSelect?.addEventListener("change", () => {
    settings.grabMode = grabModeSelect.value === "toggle" ? "toggle" : "hold";
    clearGrabToggle();
    writeSettings();
    setGameStatus(settings.grabMode === "toggle" ? "抓墙模式：切换" : "抓墙模式：按住");
    focusGame();
  });
  gamepadDeadzoneSlider?.addEventListener("input", () => {
    settings.gamepadDeadzone = clampGamepadDeadzone(Number(gamepadDeadzoneSlider.value));
    writeSettings();
    setGameStatus(`手柄死区 ${settings.gamepadDeadzone.toFixed(2)}`);
    focusGame();
  });
  touchSizeSlider?.addEventListener("input", () => {
    settings.touchSize = clampTouchSize(Number(touchSizeSlider.value));
    syncComfortSettings();
    writeSettings();
    setGameStatus(`触控按钮 ${settings.touchSize}px`);
    focusGame();
  });
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode === "password" ? "password" : "code"));
  });
  accountSendCodeButton?.addEventListener("click", sendAccountCode);
  accountSubmitButton?.addEventListener("click", submitAccountLogin);
  accountRecoveryButton?.addEventListener("click", sendPasswordRecovery);
  accountCodeInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitAccountLogin();
  });
  accountEmailInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || recoverySecret) return;
    event.preventDefault();
    if (authMode === "password" || (accountCodeInput?.value || "").trim()) submitAccountLogin();
    else sendAccountCode();
  });
  accountEmailInput?.addEventListener("input", () => {
    const tokenEmail = accountTokenEmail || readSessionValue(ACCOUNT_OTP_EMAIL_SESSION_KEY);
    if (!tokenEmail) return;
    const currentEmail = (accountEmailInput.value || "").trim().toLowerCase();
    if (currentEmail === tokenEmail) return;
    clearAccountOtpState();
    setAccountStatus("邮箱已更改，请重新获取验证码", "error");
  });
  accountPasswordInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitAccountLogin();
  });
  accountSetPasswordButton?.addEventListener("click", setAccountPassword);
  accountLogoutButton?.addEventListener("click", logoutAccount);
  cloudUploadButton?.addEventListener("click", () => uploadCloudSave({ force: true }));
  cloudDownloadButton?.addEventListener("click", downloadCloudSave);
  roomSelect?.addEventListener("change", () => {
    const target = Number(roomSelect.value);
    if (Number.isInteger(target) && target >= 0 && target < maps.length) {
      updateRoomBrief();
      updatePracticeCoach();
      setGameStatus(`已选择 R${target + 1} · 选择训练变体或按开始`);
    }
  });
  focusRoomButton?.addEventListener("click", () => {
    const target = practiceTargetRoom();
    const mode = resolveDrillMode(target);
    if (target >= 0) {
      closeSettings();
      startRoomDrill(target, mode);
    }
  });
  practicePlan?.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-plan-room]") : null;
    if (!button) return;
    const index = Number(button.getAttribute("data-plan-room"));
    const mode = button.getAttribute("data-plan-mode") || "auto";
    if (Number.isInteger(index) && index >= 0 && index < maps.length) {
      closeSettings();
      startRoomDrill(index, mode);
    }
  });
  routeContracts?.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-route-contract]") : null;
    if (!button) return;
    closeSettings();
    const id = button.getAttribute("data-route-contract") || "";
    if (button.hasAttribute("data-route-resume")) resumeRouteContract(id);
    else startRouteContract(id);
  });
  feelLab?.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-feel-fixture]") : null;
    if (!button) return;
    closeSettings();
    startFeelFixture(button.getAttribute("data-feel-fixture") || "");
  });
  drillCleanButton?.addEventListener("click", () => {
    const target = practiceTargetRoom();
    closeSettings();
    startRoomDrill(target, "clean");
  });
  drillPaceButton?.addEventListener("click", () => {
    const target = practiceTargetRoom();
    closeSettings();
    startRoomDrill(target, "pace");
  });
  drillStyleButton?.addEventListener("click", () => {
    const target = practiceTargetRoom();
    closeSettings();
    startRoomDrill(target, "style");
  });
  drillExpertButton?.addEventListener("click", () => {
    const target = practiceTargetRoom();
    closeSettings();
    startRoomDrill(target, "expert");
  });
  focusResetButton?.addEventListener("click", () => {
    if (!confirmFocusReset()) return;
    resetFocusStats();
    setGameStatus("专注训练统计已清空");
    focusGame();
  });
  practiceQueue?.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-queue-room]") : null;
    if (!button) return;
    const index = Number(button.getAttribute("data-queue-room"));
    const mode = button.getAttribute("data-queue-mode") || "auto";
    if (Number.isInteger(index) && index >= 0 && index < maps.length) {
      closeSettings();
      startRoomDrill(index, mode);
    }
  });
  challengeBoard?.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-challenge-room], [data-challenge-run]") : null;
    if (!button) return;
    if (button.hasAttribute("data-challenge-run")) {
      closeSettings();
      startSummitChallenge(button.getAttribute("data-challenge-run") || "clear");
      return;
    }
    const index = Number(button.getAttribute("data-challenge-room"));
    const mode = button.getAttribute("data-challenge-mode") || "auto";
    if (Number.isInteger(index) && index >= 0 && index < maps.length) {
      closeSettings();
      startRoomDrill(index, mode);
    }
  });
  practiceLedger?.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-ledger-room]") : null;
    if (!button) return;
    const index = Number(button.getAttribute("data-ledger-room"));
    const mode = button.getAttribute("data-ledger-mode") || "auto";
    if (Number.isInteger(index) && index >= 0 && index < maps.length) {
      closeSettings();
      startRoomDrill(index, mode);
    }
  });
  populateRoomSelect();
  initEntryMode();
  syncSettingsPanel();
  syncChallengeWins();
  initCloudAccount();

  document.querySelectorAll("[data-touch]").forEach((button) => {
    const action = button.dataset.touch;
    const set = (value) => {
      const transition = transitionDigitalInput(touch, touchPressed, action, value);
      button.classList.toggle("active", value);
      if (transition.pressed) {
        if (action === "jump") setInputBuffer(player, "jump", JUMP_BUFFER_TIME);
        if (action === "dash") setInputBuffer(player, "dash", DASH_BUFFER_TIME);
        if (actionPulse[action] !== undefined) actionPulse[action] = ACTION_PULSE_TIME;
        if (!started) begin();
      } else if (transition.released && action === "jump") {
        cutJump();
      }
    };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      set(true);
    });
    button.addEventListener("pointerup", () => set(false));
    button.addEventListener("pointercancel", () => set(false));
    button.addEventListener("pointerleave", () => set(false));
  });

  markAppReady();
  requestAnimationFrame(frame);

  function parseRoom(index) {
    const rows = maps[index];
    const entities = {
      lumens: [],
      refills: [],
      relays: [],
      updrafts: [],
      prisms: [],
      anchors: [],
      crumble: new Map(),
      checkpoints: [],
      springs: [],
      goal: null,
      start: { x: TILE * 2, y: TILE * 12 }
    };
    const tiles = rows.map((row) => row.split(""));

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tile = tiles[y][x];
        const cx = x * TILE + TILE / 2;
        const cy = y * TILE + TILE / 2;
        if (tile === "S") {
          entities.start = { x: cx - player.w / 2, y: y * TILE + TILE - player.h };
          tiles[y][x] = ".";
        }
        if (tile === "P") {
          entities.checkpoints.push({ x: cx, y: cy });
          tiles[y][x] = ".";
        }
        if (tile === "L") {
          entities.lumens.push({ id: `${index}:${x}:${y}`, x: cx, y: cy, taken: collected.has(`${index}:${x}:${y}`), bob: Math.random() * 6 });
          tiles[y][x] = ".";
        }
        if (tile === "R") {
          entities.refills.push({ x: cx, y: cy, ready: true, timer: 0, bob: Math.random() * 6 });
          tiles[y][x] = ".";
        }
        if (tile === "A") {
          entities.relays.push({ x: cx, y: cy, ready: true, timer: 0, bob: Math.random() * 6, pulse: 0 });
          tiles[y][x] = ".";
        }
        if (tile === "U") {
          entities.updrafts.push({ x: x * TILE, y: y * TILE, w: TILE, h: TILE * 4, bob: Math.random() * 6, pulse: 0 });
          tiles[y][x] = ".";
        }
        if (tile === "B") {
          entities.prisms.push({ x: cx, y: cy, ready: true, timer: 0, bob: Math.random() * 6, pulse: 0 });
          tiles[y][x] = ".";
        }
        if (tile === "M") {
          entities.anchors.push({ x: cx, y: cy, pulse: 0 });
          tiles[y][x] = ".";
        }
        if (tile === "C") {
          entities.crumble.set(`${x}:${y}`, { x, y, timer: 0, warned: false });
        }
        if (tile === "T") {
          entities.springs.push({ x: x * TILE, y: y * TILE + 18, w: TILE, h: 14, pulse: 0 });
          tiles[y][x] = ".";
        }
        if (tile === "H") {
          entities.goal = { x: cx, y: cy };
          tiles[y][x] = ".";
        }
      }
    }

    return { tiles, entities };
  }

  function resetToStart(index) {
    roomIndex = index;
    room = parseRoom(roomIndex);
    resetRoomTech();
    const checkpoint = room.entities.checkpoints[0];
    const spawn = checkpoint
      ? { x: checkpoint.x - player.w / 2, y: checkpoint.y + TILE / 2 - player.h }
      : room.entities.start;
    Object.assign(player, {
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      wasGrounded: false,
      wallDir: 0,
      wallCoyote: 0,
      wallCoyoteDir: 0,
      overdrive: 0,
      stamina: MAX_STAMINA,
      dashes: assistActive() ? 2 : 1,
      lumenReserve: assistActive(),
      dashTimer: 0,
      dashCooldown: 0,
      dashDirX: 1,
      dashDirY: 0,
      ghostTimer: 0,
      coyote: 0,
      jumpBuffer: 0,
      dashBuffer: 0,
      sparkHopTimer: 0,
      sparkHopDirX: 1,
      sparkHopDirY: 0,
      sparkHopVariant: "spark",
      wallJumpLock: 0,
      inUpdraft: false,
      deadTimer: 0,
      respawnRoom: roomIndex,
      respawnX: spawn.x,
      respawnY: spawn.y
    });
    lastAimX = player.facing;
    lastAimY = 0;
    lastAimTimer = 0;
    timingInputReady = false;
    clearGrabToggle();
    resetActionVisuals();
    triggerActionVisual("spawn", 0.32);
    routeCueTimer = 0;
    routeCueReason = "";
  }

  function isGamePaused() {
    return (settingsVisible || focusPaused) && started && !won;
  }

  function seedHair() {
    player.hair = Array.from({ length: 5 }, (_, i) => ({
      x: player.x + player.w / 2 - i * player.facing * 3.2,
      y: player.y + 7 + i * 1.15
    }));
  }

  function begin() {
    started = true;
    clearTransientTrainingResults();
    unlockAudio();
    overlay.classList.add("hidden");
    settingsVisible = false;
    syncSettingsVisibility();
    setGameStatus("游戏开始");
    focusGame();
  }

  function startSummitChallenge(challengeId = "clear") {
    const challenge = challengeById(challengeId);
    activeDrill = null;
    activeChallenge = createActiveChallenge(challenge.id);
    started = true;
    settingsVisible = false;
    syncSettingsVisibility();
    hardReset({ keepChallenge: true });
    clearTransientTrainingResults();
    started = true;
    overlay.classList.add("hidden");
    syncGameplayAccessibility();
    setGameStatus(`挑战路线开始：${challenge.label} · ${challenge.goal}`);
    focusGame();
  }

  function hasTrainingProgress() {
    return bestTime > 0
      || bestRoomTimes.some((time) => time > 0)
      || roomFocus.some((entry) => {
        return entry.faults > 0 || entry.clears > 0 || entry.drills > 0 || entry.cleanWins > 0 || entry.paceWins > 0 || entry.styleWins > 0 || entry.expertWins > 0;
      });
  }

  function refreshStartOverlay() {
    const target = recommendedPracticeRoom();
    const mode = resolveDrillMode(target);
    const progress = hasTrainingProgress();
    const canResume = progress && Number.isInteger(target) && target >= 0 && target < maps.length;
    overlay.classList.add("ready");
    if (startReadiness) startReadiness.textContent = progress ? "已读取" : "准备";
    if (loadStatus) {
      loadStatus.textContent = progress
        ? `建议 R${target + 1} ${drillModeLabel(mode)}`
        : "准备就绪";
    }
    if (startButton) startButton.textContent = progress ? "自由攀登" : "开始攀登";
    if (resumeTrainingButton) {
      resumeTrainingButton.classList.toggle("hidden", !canResume);
      resumeTrainingButton.textContent = canResume ? `继续训练 · R${target + 1} ${drillModeLabel(mode)}` : "继续训练";
      resumeTrainingButton.setAttribute("aria-hidden", String(!canResume));
    }
    syncGameplayAccessibility();
  }

  function syncGameplayAccessibility() {
    const overlayVisible = !overlay.classList.contains("hidden");
    const overlayOwnsInteraction = !started || overlayVisible;
    const available = !overlayOwnsInteraction && !settingsVisible;
    overlay.hidden = !overlayVisible;
    overlay.setAttribute("aria-hidden", String(!overlayVisible || settingsVisible));
    if (overlayVisible && !settingsVisible) overlay.removeAttribute("inert");
    else overlay.setAttribute("inert", "");
    for (const surface of [gameHud, touchControls]) {
      if (!surface) continue;
      surface.hidden = overlayOwnsInteraction;
      if (available) surface.removeAttribute("inert");
      else surface.setAttribute("inert", "");
      surface.setAttribute("aria-hidden", String(!available));
    }
    if (available) canvas.removeAttribute("inert");
    else canvas.setAttribute("inert", "");
    canvas.setAttribute("aria-hidden", String(!available));
    canvas.tabIndex = available ? 0 : -1;
  }

  function resumeRecommendedTraining() {
    const target = recommendedPracticeRoom();
    const mode = resolveDrillMode(target);
    if (!Number.isInteger(target) || target < 0 || target >= maps.length) {
      openStartTrainingPanel();
      return;
    }
    clearTransientTrainingResults();
    startRoomDrill(target, mode);
  }

  function openStartTrainingPanel() {
    accountFocused = false;
    openPanel("practice");
  }

  function openSettingsPanel() {
    accountFocused = false;
    document.querySelectorAll(".settings-group.settings-only").forEach((group) => {
      group.open = false;
      syncSettingsGroupDisclosure(group);
    });
    openPanel("settings");
  }

  function openAccountPanel() {
    accountFocused = true;
    openPanel("settings");
    if (!accountSdk) loadAppwriteSdk();
    if (accountGroup) {
      document.querySelectorAll(".settings-group.settings-only").forEach((group) => {
        group.open = group === accountGroup;
        syncSettingsGroupDisclosure(group);
      });
      accountGroup.scrollIntoView({ block: "start" });
      window.setTimeout(() => {
        if (!settingsVisible || panelMode !== "settings" || !accountFocused || !accountGroup.open) return;
        if (accountUser) {
          const cloudAction = [cloudUploadButton, cloudDownloadButton]
            .find((button) => button && !button.disabled && button.getClientRects().length > 0);
          cloudAction?.focus({ preventScroll: true });
        } else if (recoverySecret) accountPasswordInput?.focus({ preventScroll: true });
        else accountEmailInput?.focus({ preventScroll: true });
      }, 0);
    }
  }

  function openPanel(mode = "settings") {
    if (!settingsVisible
      && document.activeElement instanceof HTMLElement
      && document.activeElement !== document.body
      && document.activeElement !== document.documentElement
      && !settingsPanel?.contains(document.activeElement)) {
      panelReturnFocus = document.activeElement;
    } else if (!settingsVisible) {
      panelReturnFocus = null;
    }
    panelMode = mode === "practice" ? "practice" : "settings";
    if (panelMode === "practice" && roomSelect) roomSelect.value = String(roomIndex);
    settingsVisible = true;
    releaseAllInputs();
    syncSettingsVisibility();
    settingsPanel.scrollTop = 0;
    syncSettingsPanel();
    setGameStatus(panelMode === "practice" ? "练习面板已打开" : "设置已打开，游戏暂停");
    settingsCloseButton?.focus({ preventScroll: true });
  }

  function syncSettingsGroupDisclosure(group) {
    if (!(group instanceof HTMLDetailsElement)) return;
    group.querySelector(":scope > summary")?.setAttribute("aria-expanded", String(group.open));
  }

  function syncReviewDisclosure(details) {
    if (!(details instanceof HTMLDetailsElement)) return;
    details.querySelector(":scope > summary")?.setAttribute("aria-expanded", String(details.open));
  }

  function showGameTip(title, detail = "", kind = "storage", duration = GAME_TIP_TIME, priority = 1) {
    if (!gameTip || !gameTipTitle || !gameTipDetail) return;
    if (!GAME_TIP_CLASSES.includes(kind)) return;
    if (gameTipTimer > 0 && gameTipPriority > priority) return;
    const resolvedKind = kind;
    gameTipKind = resolvedKind;
    gameTipPriority = priority;
    gameTipMax = Math.max(0.8, duration);
    gameTipTimer = gameTipMax;
    gameTipTitle.textContent = title;
    gameTipDetail.textContent = detail;
    gameTip.classList.remove("hidden", ...GAME_TIP_CLASSES);
    gameTip.classList.add(resolvedKind);
    gameTip.style.setProperty("--tip-progress", "100%");
  }

  function clearGameTip(kind = "") {
    if (kind && gameTipKind !== kind) return;
    gameTipTimer = 0;
    gameTipMax = GAME_TIP_TIME;
    gameTipKind = "";
    gameTipPriority = 0;
    if (gameTip) {
      gameTip.classList.add("hidden");
      gameTip.classList.remove(...GAME_TIP_CLASSES);
      gameTip.style.setProperty("--tip-progress", "0%");
    }
  }

  function gameTipVisible(kind = "") {
    return gameTipTimer > 0 && (!kind || gameTipKind === kind);
  }

  function updateGameTip(dt) {
    if (gameTipTimer <= 0) return;
    gameTipTimer = Math.max(0, gameTipTimer - dt);
    if (!gameTip || gameTipTimer <= 0) {
      clearGameTip();
      return;
    }
    const progress = `${Math.max(0, Math.min(100, (gameTipTimer / gameTipMax) * 100)).toFixed(1)}%`;
    gameTip.style.setProperty("--tip-progress", progress);
  }

  function hardReset(options = {}) {
    collected = new Set();
    deathCount = 0;
    deathReasons = createDeathReasons();
    roomMistakes = createRoomCounters();
    runRoomTimes = createRoomCounters();
    roomAttemptClean = true;
    runUsedAssist = assistActive();
    lastDeathReason = "none";
    crumbleSlipTimer = 0;
    clearFocusPopup();
    clearMasteryPopup();
    runTime = 0;
    roomTime = 0;
    chapterTransitionTimer = 0;
    chapterTransitionFromChapter = -1;
    chapterTransitionFromResult = null;
    clearAmbientVoices();
    ambientStep = 0;
    ambientNextTime = audioContext?.currentTime || 0;
    timingArmed = false;
    timingInputReady = false;
    won = false;
    summitRevealTimer = 0;
    pendingSummitResult = null;
    summitChapterResult = null;
    hitStopTimer = 0;
    shakeTimer = 0;
    shakeDuration = 0;
    shakePower = 0;
    particles.length = 0;
    ghosts.length = 0;
    lightTrails.length = 0;
    shards.length = 0;
    recentPath.length = 0;
    roomPath.length = 0;
    pathSampleTimer = 0;
    relayChain = 0;
    relayChainTimer = 0;
    clearSplitPopup();
    resetFlow();
    echoAnchor = null;
    recallCooldown = 0;
    recallPulseTimer = 0;
    nearMissCooldown = 0;
    clearGameTip();
    applyTrainingTransition("hardReset", {
      keepChallenge: Boolean(options.keepChallenge) && !assistActive(),
      keepRoute: Boolean(options.keepRoute),
      keepFeel: Boolean(options.keepFeel)
    });
    resetActionPulses();
    overlay.classList.remove("finish-overlay");
    overlay.classList.add("hidden");
    overlay.removeAttribute("role");
    overlay.removeAttribute("aria-modal");
    overlay.removeAttribute("aria-labelledby");
    overlay.scrollTop = 0;
    syncGameplayAccessibility();
    resetToStart(0);
    refreshRoomSelectOptions();
    updateHud();
    focusGame();
  }

  function jumpToRoom(index, options = {}) {
    collected = new Set();
    deathCount = 0;
    deathReasons = createDeathReasons();
    roomMistakes = createRoomCounters();
    runRoomTimes = createRoomCounters();
    roomAttemptClean = true;
    runUsedAssist = assistActive();
    lastDeathReason = "none";
    crumbleSlipTimer = 0;
    clearFocusPopup();
    clearMasteryPopup();
    runTime = 0;
    roomTime = 0;
    chapterTransitionTimer = 0;
    chapterTransitionFromChapter = -1;
    chapterTransitionFromResult = null;
    clearAmbientVoices();
    ambientStep = 0;
    ambientNextTime = audioContext?.currentTime || 0;
    timingArmed = false;
    timingInputReady = false;
    won = false;
    summitRevealTimer = 0;
    pendingSummitResult = null;
    summitChapterResult = null;
    hitStopTimer = 0;
    particles.length = 0;
    ghosts.length = 0;
    lightTrails.length = 0;
    shards.length = 0;
    recentPath.length = 0;
    roomPath.length = 0;
    pathSampleTimer = 0;
    relayChain = 0;
    relayChainTimer = 0;
    clearSplitPopup();
    resetFlow();
    echoAnchor = null;
    recallCooldown = 0;
    recallPulseTimer = 0;
    nearMissCooldown = 0;
    clearGameTip();
    applyTrainingTransition("jumpRoom", {
      keepDrill: Boolean(options.keepDrill),
      keepChallenge: Boolean(options.keepChallenge),
      keepRoute: Boolean(options.keepRoute),
      keepFeel: Boolean(options.keepFeel)
    });
    resetActionPulses();
    overlay.classList.add("hidden");
    started = true;
    syncGameplayAccessibility();
    resetToStart(index);
    roomAttemptClean = true;
    seedHair();
    if (options.chapterEntry && [3, 6, 8].includes(index)) beginChapterEntry(index);
    refreshRoomSelectOptions();
    updateHud();
    focusGame();
  }

  function clearTrainingTransitionState(options = {}) {
    if (!options.keepDrill) activeDrill = null;
    if (!options.keepChallenge) activeChallenge = null;
    if (!options.keepRoute) cancelActiveRouteContract(options.routeReason || "路线中断");
    if (!options.keepFeel) cancelActiveFeelFixture(options.feelReason || "校准中断");
  }

  function applyTrainingTransition(name, overrides = {}) {
    clearTrainingTransitionState(trainingTransitionOptionsData(name, overrides));
  }

  function clearTransientTrainingResults() {
    lastRouteContractResult = null;
    lastFeelFixtureResult = null;
    lastRouteContractsHtml = "";
    lastFeelLabHtml = "";
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    fps = fps * 0.9 + (dt > 0 ? (1 / dt) * 0.1 : 0);
    const paused = isGamePaused();
    updateGlobalEffects(paused ? 0 : dt);
    updateAmbientMusic(paused);
    if (!started || won) {
      updateGamepad();
      if (!started && (gamepadPressed.has("jump") || gamepadPressed.has("dash"))) {
        begin();
      }
    }

    if (started && !won && !paused) {
      if (chapterTransitionTimer > 0) {
        updateParticles(dt * 0.22);
        updateHair(dt);
        updateHud();
      } else {
        update(assistActive() ? dt * ASSIST_SPEED : dt, dt);
      }
    } else {
      updateParticles(paused ? dt * 0.25 : dt);
      updateGhosts(paused ? 0 : dt);
      updateRelayChain(paused ? 0 : dt);
      if (paused) updateHud();
    }

    render(now / 1000);
    clearInputEdges(pressed, touchPressed, gamepadPressed);
    requestAnimationFrame(frame);
  }

  function update(dt, clockDt = dt) {
    if (assistActive()) runUsedAssist = true;
    updateRelayChain(dt);
    updateActionVisuals(dt);

    if (hitStopTimer > 0) {
      hitStopTimer = Math.max(0, hitStopTimer - dt);
      updateParticles(dt * 0.3);
      updateGhosts(dt);
      updateHud();
      return;
    }

    updateBuffers(dt);
    updateGrabModeState();
    if (player.deadTimer > 0) {
      player.deadTimer -= dt;
      updateParticles(dt);
      updateGhosts(dt);
      if (player.deadTimer <= 0) {
        respawn();
      }
      updateHud();
      return;
    }

    const input = getInput();
    const timingIntent = hasTimingIntent(input);
    if (!timingIntent) timingInputReady = true;
    if (!timingArmed && timingIntent && timingInputReady) {
      timingArmed = true;
      setGameStatus(`R${roomIndex + 1} 计时开始`);
    }
    if (timingArmed) {
      runTime += clockDt;
      roomTime += clockDt;
      runRoomTimes[roomIndex] = (runRoomTimes[roomIndex] || 0) + clockDt;
    }
    updateLastAim(input, dt);
    if (input.x !== 0) {
      player.facing = input.x;
    }

    player.wasGrounded = player.onGround;
    player.onGround = false;
    player.wallDir = getWallDir();
    if (player.wallDir !== 0 && !player.wasGrounded) {
      player.wallCoyote = WALL_COYOTE_TIME;
      player.wallCoyoteDir = player.wallDir;
    } else {
      player.wallCoyote = Math.max(0, player.wallCoyote - dt);
      if (player.wallCoyote <= 0) player.wallCoyoteDir = 0;
    }
    player.coyote = player.wasGrounded ? COYOTE_TIME : Math.max(0, player.coyote - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.sparkHopTimer = Math.max(0, player.sparkHopTimer - dt);
    player.wallJumpLock = Math.max(0, player.wallJumpLock - dt);
    player.overdrive = Math.max(0, player.overdrive - dt);
    updateInputCues(input);

    if (player.onGround || player.wasGrounded) {
      player.stamina = MAX_STAMINA;
      restoreDashCharge();
      player.sparkHopTimer = 0;
      player.wallCoyote = 0;
      player.wallCoyoteDir = 0;
    }

    const wantsDash = hasInputBuffer(player, "dash") && player.dashes > 0 && player.dashCooldown <= 0;
    if (wantsDash) {
      startDash(input);
    }

    if (player.dashTimer > 0) {
      player.dashTimer = Math.max(0, player.dashTimer - dt);
      const ghostTimerArmed = player.ghostTimer > 0;
      player.ghostTimer -= dt;
      if (player.ghostTimer <= 0) {
        if (ghostTimerArmed) addGhost(settings.calmEffects ? 0.28 : 0.34);
        player.ghostTimer = settings.lowPerformance ? 0.08 : settings.calmEffects ? 0.055 : 0.04;
      }
      if (player.dashTimer <= 0) {
        player.vx *= 0.78;
        player.vy *= 0.62;
        armSparkHop();
      }
    } else {
      runGroundAir(input, dt);
      if (assistActive()) player.stamina = MAX_STAMINA;
      climb(input, dt);
      if (assistActive()) player.stamina = MAX_STAMINA;
      jump(input);
      const maxFall = input.y > 0 ? FAST_FALL_MAX : MAX_FALL;
      player.vy = Math.min(maxFall, player.vy + currentGravity(input) * dt);
    }

    const fallSpeed = player.vy;
    moveAxis("x", player.vx * dt);
    moveAxis("y", player.vy * dt);
    unstuckFromSolids();
    if (!player.wasGrounded && player.onGround && fallSpeed > 420) {
      triggerActionVisual("land", 0.18);
      playSound("land", 1);
      shake(0.055, Math.min(2.4, fallSpeed / 320));
      burst(player.x + player.w / 2, player.y + player.h, "#e9f7ff", 3, 82);
    } else if (!player.wasGrounded && player.onGround && fallSpeed > 180) {
      triggerActionVisual("land", 0.12);
      playSound("land", 0.65);
    }
    resolveRoomTransition();
    updateEntities(dt, input);
    updateHair(dt);
    updateParticles(dt);
    updateGhosts(dt);
    updateLightTrails(dt);
    samplePlayerPath(dt);
    updateHud();
  }

  function updateBuffers(dt) {
    updateGamepad();
    tickInputBuffers(player, dt);

    if (justPressedAny(actionCodes("jump")) || touchPressed.has("jump") || gamepadPressed.has("jump")) {
      setInputBuffer(player, "jump", JUMP_BUFFER_TIME);
    }
    if (justPressedAny(actionCodes("dash")) || touchPressed.has("dash") || gamepadPressed.has("dash")) {
      setInputBuffer(player, "dash", DASH_BUFFER_TIME);
    }
    if ((touchPressed.has("recall") || gamepadPressed.has("recall")) && started && !won) {
      recallToAnchor();
    }
  }

  function runGroundAir(input, dt) {
    const preservingLaunch = player.wallJumpLock > 0 && !player.wasGrounded && Math.abs(player.vx) > MOVE_SPEED;
    if (!preservingLaunch) {
      const lockedAgainstPush = player.wallJumpLock > 0 && input.x !== 0 && Math.sign(player.vx) !== input.x;
      const moveX = lockedAgainstPush ? 0 : input.x;
      const speedMult = player.overdrive > 0 ? OVERDRIVE_RUN_MULT : 1;
      const target = moveX * MOVE_SPEED * speedMult;
      const turning = moveX !== 0 && Math.abs(player.vx) > 24 && Math.sign(player.vx) !== Math.sign(target);
      const accelMult = player.overdrive > 0 ? 1.12 : 1;
      const accel = (turning ? TURN_ACCEL : player.wasGrounded ? ACCEL : AIR_ACCEL) * accelMult;
      player.vx = approach(player.vx, target, accel * dt);
      if (moveX !== 0 && Math.abs(player.vx - target) < 3) {
        player.vx = target;
      }
      if (moveX === 0 && player.wasGrounded) {
        player.vx = approach(player.vx, 0, FRICTION * dt);
      }
    }

    if (player.wallDir !== 0 && !player.wasGrounded && player.vy > 190) {
      player.vy = 190;
      addSnow(player.x + (player.wallDir > 0 ? player.w : 0), player.y + player.h * 0.45, 2);
    }
  }

  function climb(input, dt) {
    const grabbing = input.grab && player.wallDir !== 0 && player.stamina > 0 && !player.wasGrounded;
    if (!grabbing || player.dashTimer > 0) return;

    player.vx = player.wallDir * 16;
    const climbTarget = input.y < 0 ? -96 : input.y > 0 ? 145 : 34;
    player.vy = approach(player.vy, climbTarget, 1200 * dt);
    player.stamina = Math.max(0, player.stamina - (input.y < 0 ? 0.52 : 0.28) * dt);
    addSnow(player.x + (player.wallDir > 0 ? player.w : 0), player.y + player.h * 0.35, 1);
  }

  function updateLastAim(input, dt) {
    if (input.x !== 0 || input.y !== 0) {
      lastAimX = input.x;
      lastAimY = input.y;
      lastAimTimer = DASH_AIM_MEMORY;
      return;
    }
    lastAimTimer = Math.max(0, lastAimTimer - dt);
  }

  function jump(input) {
    if (!hasInputBuffer(player, "jump")) return;
    const bufferedJump = player.jumpBuffer < JUMP_BUFFER_TIME - 0.026;

    if (player.coyote > 0 || player.wasGrounded) {
      const coyoteJump = !player.wasGrounded && player.coyote > 0;
      player.vy = -JUMP;
      consumeInputBuffer(player, "jump");
      player.coyote = 0;
      addFlow(4, "jump");
      triggerActionVisual("jump", 0.2);
      if (coyoteJump) showFeelCue("COYOTE", "离地宽限命中", palette.gold);
      else if (bufferedJump) showFeelCue("BUFFER", "提前输入接住落地", palette.green);
      playSound("jump");
      shake(0.035, 1.1);
      return;
    }

    if (player.sparkHopTimer > 0 && player.dashTimer <= 0) {
      sparkHop();
      return;
    }

    const wallJumpDir = player.wallDir || (player.wallCoyote > 0 ? player.wallCoyoteDir : 0);
    if (wallJumpDir !== 0) {
      const wallGrace = player.wallDir === 0 && player.wallCoyote > 0;
      const away = input.x === -wallJumpDir;
      const climbJump = input.grab && player.stamina > 0;
      const push = climbJump ? WALL_CLIMB_X : away ? WALL_JUMP_X : WALL_NEUTRAL_X;
      const lift = climbJump ? JUMP * (input.y > 0 ? 0.9 : 1.02) : away ? JUMP * 0.96 : JUMP * 0.91;
      player.vx = -wallJumpDir * push;
      player.vy = -lift;
      consumeInputBuffer(player, "jump");
      player.facing = -wallJumpDir;
      player.wallJumpLock = WALL_JUMP_LOCK_TIME;
      player.wallCoyote = 0;
      player.wallCoyoteDir = 0;
      if (climbJump) player.stamina = Math.max(0, player.stamina - 0.18);
      addFlow(climbJump ? 8 : 6, climbJump ? "climb" : "wall");
      triggerActionVisual("wall", 0.22);
      triggerActionVisual("jump", 0.16);
      showFeelCue(wallGrace ? "WALL GRACE" : climbJump ? "CLIMB JUMP" : "WALL JUMP", wallGrace ? "离墙宽限命中" : away ? "反向推离墙面" : "墙面节奏重置", wallGrace ? palette.gold : palette.cyan);
      playSound("wall");
      shake(0.04, 1.35);
      burst(player.x + (wallJumpDir > 0 ? player.w : 0), player.y + player.h * 0.55, climbJump ? palette.green : "#e9f7ff", 6, 170);
    }
  }

  function sparkHop() {
    const dir = player.sparkHopDirX || player.facing;
    const variant = player.sparkHopVariant === "prismSpark" ? "prismSpark" : player.sparkHopVariant === "wallSpark" ? "wallSpark" : "spark";
    const xMult = variant === "wallSpark" ? WALL_SPARK_X_MULT : variant === "prismSpark" ? PRISM_SPARK_MULT : 1;
    const yMult = variant === "prismSpark" ? PRISM_SPARK_MULT : 1;
    if (dir !== 0) {
      player.vx = Math.sign(dir) * Math.max(Math.abs(player.vx), SPARK_HOP_X * xMult);
    }
    player.vy = Math.min(player.vy, -SPARK_HOP_Y * yMult);
    consumeInputBuffer(player, "jump");
    player.sparkHopTimer = 0;
    player.sparkHopVariant = "spark";
    player.wallJumpLock = WALL_JUMP_LOCK_TIME;
    markRoomTech("spark");
    markRoomTech(variant);
    addFlow(12, "spark");
    triggerSparkVariantVisual(variant);
    playSound(variant);
    hitStopTimer = Math.max(hitStopTimer, 0.012);
    burst(player.x + player.w / 2, player.y + player.h / 2, "#f8fbff", 7, 200);
    burst(player.x + player.w / 2, player.y + player.h, palette.cyan, 4, 155);
  }

  function armSparkHop() {
    if (player.wasGrounded || player.onGround || player.deadTimer > 0) return;
    player.sparkHopTimer = SPARK_HOP_WINDOW;
    player.sparkHopDirX = player.dashDirX;
    player.sparkHopDirY = player.dashDirY;
    player.sparkHopVariant = player.overdrive > 0 ? "prismSpark" : (player.wallDir || getWallDir()) !== 0 ? "wallSpark" : "spark";
  }

  function startDash(input) {
    let dx = input.x;
    let dy = input.y;
    const usedAimMemory = dx === 0 && dy === 0 && lastAimTimer > 0;
    if (dx === 0 && dy === 0 && lastAimTimer > 0) {
      dx = lastAimX;
      dy = lastAimY;
    }
    if (dx === 0 && dy === 0) dx = player.facing;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const dashSpeed = DASH_SPEED * (player.overdrive > 0 ? OVERDRIVE_DASH_MULT : 1);
    player.vx = dx * dashSpeed;
    player.vy = dy * dashSpeed;
    if (player.dashes > 1) player.lumenReserve = false;
    player.dashes -= 1;
    player.dashTimer = DASH_TIME;
    player.dashCooldown = 0.07;
    player.dashDirX = dx;
    player.dashDirY = dy;
    player.sparkHopTimer = 0;
    player.ghostTimer = 0;
    consumeInputBuffer(player, "dash");
    player.coyote = 0;
    player.facing = dx === 0 ? player.facing : Math.sign(dx);
    addFlow(player.overdrive > 0 ? 8 : 5, player.overdrive > 0 ? "over" : "dash");
    triggerActionVisual("dash", 0.24);
    if (usedAimMemory) showFeelCue("AIM MEMORY", "沿用上一冲刺方向", palette.cyan, 0.54);
    playSound(player.overdrive > 0 ? "prism" : "dash");
    hitStopTimer = Math.max(hitStopTimer, DASH_HITSTOP);
    shake(0.08, 2.4);
    addGhost(0.36);
    spawnLightTrail(dx, dy);
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.cyan, 8, 285);
    const shardCount = settings.lowPerformance ? 3 : 5;
    for (let i = 0; i < shardCount; i++) {
      shards.push({
        x: player.x + player.w / 2 - dx * i * 8,
        y: player.y + player.h / 2 - dy * i * 5,
        life: 0.18 + i * 0.018,
        max: 0.22 + i * 0.018,
        r: 8 - i * 0.55
      });
    }
    budgetEffectQueue("shards", shards);
  }

  function restoreDashCharge() {
    if (assistActive()) {
      player.dashes = 2;
      player.lumenReserve = true;
      return;
    }
    player.dashes = player.lumenReserve ? 2 : 1;
  }

  function updateEntities(dt, input) {
    const wasInUpdraft = player.inUpdraft;
    player.inUpdraft = false;
    const box = getPlayerBox();

    for (const lumen of room.entities.lumens) {
      if (!lumen.taken && distRectPoint(box, lumen.x, lumen.y) < 22) {
        lumen.taken = true;
        collected.add(lumen.id);
        player.dashes = Math.min(2, player.dashes + 1);
        player.lumenReserve = player.dashes > 1;
        player.dashCooldown = 0;
        addFlow(18, "lumen");
        playSound("refill", 0.65);
        setGameStatus(player.lumenReserve ? "微光储备：额外冲刺已就绪" : "微光拾取：冲刺已恢复");
        if (!lumenReserveExplained) {
          lumenReserveExplained = true;
          showGameTip("微光储备", "满冲刺拾取可保留第二次冲刺；金色冲刺条表示储备就绪", "storage", 1.8, 3);
        }
        burst(lumen.x, lumen.y, palette.gold, 10, 190);
      }
      lumen.bob += dt * 4;
    }

    for (const updraft of room.entities.updrafts) {
      updraft.bob += dt * 5.2;
      updraft.pulse = Math.max(0, updraft.pulse - dt);
      const field = updraftFieldBounds(updraft);
      if (aabb(box, field)) {
        const enteredUpdraft = !wasInUpdraft && !player.inUpdraft;
        player.inUpdraft = true;
        markRoomTech("updraft");
        showMechanicFirstTouchCue("updraft");
        if (enteredUpdraft) {
          playSound("wind", 0.58);
        }
        const center = field.x + field.w / 2;
        const pull = Math.max(-1, Math.min(1, (center - (player.x + player.w / 2)) / 34));
        const downResist = input.y > 0 ? 0.72 : 1;
        player.vy = Math.max(-UPDRAFT_RISE_SPEED, player.vy - UPDRAFT_FORCE * downResist * dt);
        player.vx += pull * 60 * dt;
        player.stamina = Math.min(MAX_STAMINA, player.stamina + 0.22 * dt);
        updraft.pulse = 0.26;
        if (Math.random() < (settings.calmEffects ? 0.14 : 0.22)) addSnow(center + (Math.random() - 0.5) * 26, field.y + field.h - 8, 1);
      }
    }

    for (const refill of room.entities.refills) {
      refill.bob += dt * 4.3;
      if (!refill.ready) {
        refill.timer -= dt;
        if (refill.timer <= 0) refill.ready = true;
      }
      if (refill.ready && distRectPoint(box, refill.x, refill.y) < 24) {
        refill.ready = false;
        refill.timer = 3.2;
        restoreDashCharge();
        player.stamina = MAX_STAMINA;
        player.dashCooldown = 0;
        addFlow(14, "refill");
        playSound("refill");
        burst(refill.x, refill.y, palette.cyan, 26, 310);
      }
    }

    for (const relay of room.entities.relays) {
      relay.bob += dt * 4.1;
      relay.pulse = Math.max(0, relay.pulse - dt);
      if (!relay.ready) {
        relay.timer -= dt;
        if (relay.timer <= 0) relay.ready = true;
      }
      const speed = Math.hypot(player.vx, player.vy);
      const charged = player.dashTimer > 0 || player.sparkHopTimer > 0 || speed >= RELAY_TRIGGER_SPEED;
      if (relay.ready && charged && distRectPoint(box, relay.x, relay.y) < 26) {
        const chain = scoreRelayChain();
        markRoomTech("relay");
        showMechanicFirstTouchCue("relay");
        if (chain >= 3) markRoomTech("relayChain");
        relay.ready = false;
        relay.timer = RELAY_RESET_TIME;
        relay.pulse = Math.min(0.46, 0.24 + chain * 0.045);
        restoreDashCharge();
        player.dashCooldown = 0;
        player.stamina = MAX_STAMINA;
        player.sparkHopTimer = Math.max(player.sparkHopTimer, SPARK_HOP_WINDOW * 0.72);
        player.sparkHopDirX = player.vx === 0 ? player.facing : Math.sign(player.vx);
        player.sparkHopDirY = Math.sign(player.vy);
        player.sparkHopVariant = player.overdrive > 0 ? "prismSpark" : "spark";
        player.vy = Math.min(player.vy, -140 - Math.min(90, chain * 18));
        addFlow(22 + chain * 8, chain >= 3 ? "chain" : "relay");
        triggerActionVisual("relay", chain >= 3 ? 0.34 : 0.24);
        playSound(chain >= 3 ? "chain" : "relay");
        burst(relay.x, relay.y, "#f8fbff", 8 + chain * 2, 220 + chain * 18);
        burst(relay.x, relay.y, chain >= 3 ? palette.gold : palette.cyan, 18 + chain * 3, 330 + chain * 20);
      } else if (relay.ready && distRectPoint(box, relay.x, relay.y) < 30) {
        relay.pulse = Math.max(relay.pulse, 0.08);
      }
    }

    for (const prism of room.entities.prisms) {
      prism.bob += dt * 3.8;
      prism.pulse = Math.max(0, prism.pulse - dt);
      if (!prism.ready) {
        prism.timer -= dt;
        if (prism.timer <= 0) prism.ready = true;
      }
      const speed = Math.hypot(player.vx, player.vy);
      const charged = player.dashTimer > 0 || player.sparkHopTimer > 0 || player.overdrive > 0 || speed >= RELAY_TRIGGER_SPEED;
      if (prism.ready && charged && distRectPoint(box, prism.x, prism.y) < 30) {
        const aimX = input.x || lastAimX || player.facing;
        const aimY = input.y || lastAimY;
        const len = Math.hypot(aimX, aimY) || 1;
        const dx = aimX / len;
        const dy = aimY / len;
        prism.ready = false;
        prism.timer = PRISM_RESET_TIME;
        prism.pulse = 0.5;
        markRoomTech("prism");
        showMechanicFirstTouchCue("prism");
        player.overdrive = OVERDRIVE_TIME;
        restoreDashCharge();
        player.dashCooldown = 0;
        player.stamina = MAX_STAMINA;
        player.vx += dx * 180;
        player.vy = Math.min(player.vy + dy * 150, -160);
        addFlow(34, "prism");
        triggerActionVisual("prism", 0.42);
        playSound("prism");
        hitStopTimer = Math.max(hitStopTimer, 0.014);
        burst(prism.x, prism.y, "#f8fbff", 12, 260);
        burst(prism.x, prism.y, palette.gold, 26, 390);
      } else if (prism.ready && distRectPoint(box, prism.x, prism.y) < 34) {
        prism.pulse = Math.max(prism.pulse, 0.1);
      }
    }

    for (const checkpoint of room.entities.checkpoints) {
      if (distRectPoint(box, checkpoint.x, checkpoint.y) < 26) {
        const nextX = checkpoint.x - player.w / 2;
        const nextY = checkpoint.y + TILE / 2 - player.h;
        const changed = player.respawnRoom !== roomIndex
          || Math.abs(player.respawnX - nextX) > 1
          || Math.abs(player.respawnY - nextY) > 1;
        player.respawnRoom = roomIndex;
        player.respawnX = nextX;
        player.respawnY = nextY;
        if (changed) {
          playSound("checkpoint", 0.72);
          setGameStatus(`检查点已点亮 · R${roomIndex + 1}`);
          glow(checkpoint.x, checkpoint.y, palette.green);
          burst(checkpoint.x, checkpoint.y + 8, palette.green, 4, 90);
        }
      }
    }

    for (const anchor of room.entities.anchors) {
      anchor.pulse = Math.max(0, anchor.pulse - dt);
      if (distRectPoint(box, anchor.x, anchor.y) < 26) {
        const next = { room: roomIndex, x: anchor.x - player.w / 2, y: anchor.y + TILE / 2 - player.h };
        const changed = !echoAnchor || echoAnchor.room !== next.room || Math.abs(echoAnchor.x - next.x) > 1 || Math.abs(echoAnchor.y - next.y) > 1;
        echoAnchor = next;
        markRoomTech("echo");
        anchor.pulse = 0.3;
        recallPulseTimer = Math.max(recallPulseTimer, 0.35);
        if (changed) {
          if (!echoLessonShown) {
            echoLessonShown = true;
            echoLessonTimer = ECHO_LESSON_TIME;
          }
          addFlow(10, "echo");
          triggerActionVisual("recall", 0.2);
          playSound("echo");
          setGameStatus("回声锚点已激活，可随时召回");
          burst(anchor.x, anchor.y, palette.green, 14, 220);
        }
      }
    }

    for (const spring of room.entities.springs) {
      spring.pulse = Math.max(0, spring.pulse - dt);
      if (aabb(box, spring) && player.vy >= 0) {
        player.y = spring.y - player.h;
        player.vy = -720;
        markRoomTech("spring");
        showMechanicFirstTouchCue("spring");
        restoreDashCharge();
        player.stamina = MAX_STAMINA;
        spring.pulse = 0.22;
        triggerActionVisual("spring", 0.24);
        playSound("spring");
        burst(spring.x + spring.w / 2, spring.y + 6, palette.green, 16, 260);
      }
    }

    if (room.entities.goal && distRectPoint(box, room.entities.goal.x, room.entities.goal.y) < 28) {
      const result = completeRun();
      if (result.drillResult === false) return;
      beginSummitReveal(result);
    }

    const hazard = touchingHazard(box);
    if (!hazard && nearMissCooldown <= 0 && Math.hypot(player.vx, player.vy) > 320 && nearHazard(box, 10)) {
      nearMissCooldown = NEAR_MISS_COOLDOWN;
      addFlow(16, "edge");
      burst(player.x + player.w / 2, player.y + player.h / 2, palette.hot, 5, 150);
    }

    if (hazard || player.y > H + 80) {
      die(hazard ? "spike" : crumbleSlipTimer > 0 ? "crumble" : "fall");
    }
  }

  function completeRun() {
    const clearedClean = roomAttemptClean;
    const masteryBefore = roomMasteryScore(roomIndex);
    const roomResult = recordRoomBest(roomIndex);
    markRoomClear(roomIndex);
    const drillMode = activeDrill && activeDrill.room === roomIndex ? activeDrill.mode : "";
    const drillResult = completeDrill(roomIndex, clearedClean);
    if (drillResult === false) return { isBest: false, drillResult };
    showMasteryPopup(roomIndex, masteryBefore, clearedClean, drillResult === true ? drillMode : "", roomResult);
    addFlow(120, "summit");
    const eligible = recordsEligible();
    if (eligible) recordSummitProfile();
    if (eligible && (bestTime <= 0 || runTime < bestTime)) {
      bestTime = runTime;
      writeBestTime(bestTime);
      return { isBest: true, drillResult, assisted: false };
    }
    return { isBest: false, drillResult, assisted: !eligible };
  }

  function beginSummitReveal(result) {
    won = true;
    summitChapterResult = chapterResultForTransition(chapterIndexForRoom(roomIndex));
    summitRevealTimer = prefersReducedMotion ? 1.35 : SUMMIT_REVEAL_TIME;
    pendingSummitResult = result;
    const expectedResult = result;
    const fallbackDelay = summitRevealTimer * 1000 + 120;
    window.setTimeout(() => {
      if (!won || pendingSummitResult !== expectedResult) return;
      finishSummitReveal();
    }, fallbackDelay);
    overlay.classList.add("hidden");
    clearSplitPopup();
    clearMasteryPopup();
    clearFocusPopup();
    setGameStatus(`星顶回应 · ${summitChapterResultText(summitChapterResult)}`);
    resetRelayChain();
    player.vx = 0;
    player.vy = 0;
    clearAmbientVoices();
    playSummitSound();
    const goal = room.entities.goal;
    if (goal) {
      burst(goal.x, goal.y, palette.gold, 30, 300);
      burst(goal.x, goal.y, palette.cyan, settings.lowPerformance ? 10 : 20, 220);
    }
  }

  function updateSummitReveal(dt) {
    if (summitRevealTimer <= 0) return;
    summitRevealTimer = Math.max(0, summitRevealTimer - dt);
    if (summitRevealTimer > 0 || !pendingSummitResult) return;
    finishSummitReveal();
  }

  function finishSummitReveal() {
    if (!pendingSummitResult) return;
    const result = pendingSummitResult;
    pendingSummitResult = null;
    summitRevealTimer = 0;
    showFinishOverlay(result.isBest, result.assisted);
  }

  function showFinishOverlay(isBest, assisted = runUsedAssist) {
    const record = isBest ? " · 新纪录" : "";
    const assistNote = assisted ? " · 辅助完成，不计纪录" : "";
    overlay.innerHTML = `<h1 class="finish-title" id="finishTitle" tabindex="-1">登顶</h1><p class="finish-line">${formatTime(runTime)}${record}${assistNote} · 失误 ${deathCount} · 光继连锁 ${bestRelayChain} · Flow ${Math.floor(flowPeak)}</p><p class="finish-whisper">山没有变轻，是你学会了继续向上。</p><p>${escapeHtml(masterySummary())}</p>${summitReviewCardsHtml()}<button class="primary" id="restartButton" type="button">再来</button>`;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "finishTitle");
    overlay.classList.add("finish-overlay");
    overlay.classList.remove("hidden");
    syncGameplayAccessibility();
    bindFinishReviewActions();
    document.getElementById("finishTitle")?.focus({ preventScroll: true });
  }

  function recordSummitProfile() {
    profile.summitClears += 1;
    profile.lastClearTime = runTime;
    profile.lastClearAt = new Date().toISOString();
    if (profile.bestDeathCount === null || deathCount < profile.bestDeathCount) {
      profile.bestDeathCount = deathCount;
    }
    profile.bestRelayChain = Math.max(profile.bestRelayChain, bestRelayChain);
    profile.bestFlowPeak = Math.max(profile.bestFlowPeak, Math.floor(flowPeak), bestFlow);
    syncChallengeWins({ persist: false });
    writeProfile();
  }

  function scoreRelayChain() {
    relayChain = relayChainTimer > 0 ? relayChain + 1 : 1;
    relayChainTimer = RELAY_CHAIN_TIME;
    bestRelayChain = Math.max(bestRelayChain, relayChain);
    return relayChain;
  }

  function updateRelayChain(dt) {
    relayChainTimer = Math.max(0, relayChainTimer - dt);
    if (relayChainTimer <= 0) relayChain = 0;
  }

  function resetRelayChain() {
    relayChain = 0;
    relayChainTimer = 0;
  }

  function addFlow(amount) {
    const chainBonus = flowTimer > 0 ? 1.18 : 1;
    flowScore = Math.min(999, flowScore + amount * chainBonus);
    flowPeak = Math.max(flowPeak, flowScore);
    if (recordsEligible() && flowPeak > bestFlow) {
      bestFlow = flowPeak;
      writeBestFlow(bestFlow);
      syncChallengeWins();
    }
    flowTimer = FLOW_DECAY_TIME;
  }

  function updateFlow(dt) {
    flowTimer = Math.max(0, flowTimer - dt);
    if (flowTimer <= 0 && flowScore > 0) {
      flowScore = Math.max(0, flowScore - FLOW_DECAY_RATE * dt);
    }
  }

  function resetFlow() {
    flowScore = 0;
    flowPeak = 0;
    flowTimer = 0;
  }

  function breakFlow() {
    flowScore = 0;
    flowTimer = 0;
  }

  function readBestTime() {
    try {
      return finiteNonNegativeNumber(localStorage.getItem(BEST_TIME_KEY) || 0, 0, 36000);
    } catch {
      return 0;
    }
  }

  function writeBestTime(value) {
    try {
      localStorage.setItem(BEST_TIME_KEY, String(value));
      scheduleCloudSave();
    } catch {
      // Best time is a bonus; gameplay should keep working without storage.
    }
  }

  function readBestFlow() {
    try {
      return finiteNonNegativeNumber(localStorage.getItem(BEST_FLOW_KEY) || 0, 0, 999);
    } catch {
      return 0;
    }
  }

  function writeBestFlow(value) {
    try {
      localStorage.setItem(BEST_FLOW_KEY, String(Math.floor(value)));
      scheduleCloudSave();
    } catch {
      // Flow bests are optional practice data.
    }
  }

  function markStorageIssue(message) {
    storageHealthMessage = message;
  }

  function readStoredJson(key, fallback, normalize) {
    return readStoredJsonData(localStorage, key, fallback, normalize, markStorageIssue);
  }

  function normalizeProfile(saved) {
    return normalizeProfileData(saved, {
      schemaVersion: PROFILE_SCHEMA_VERSION,
      challengeIds: LONG_TERM_CHALLENGES.map((challenge) => challenge.id)
    });
  }

  function readProfile() {
    return readStoredJson(PROFILE_KEY, {}, normalizeProfile);
  }

  function writeProfile() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      scheduleCloudSave();
    } catch {
      // Long-term profile data is optional and should not block play.
    }
  }

  function readRoomBests() {
    return readStoredJson(ROOM_BESTS_KEY, [], normalizeRoomBests);
  }

  function normalizeRoomBests(saved) {
    return normalizeRoomBestsData(saved, maps.length);
  }

  function writeRoomBests() {
    try {
      localStorage.setItem(ROOM_BESTS_KEY, JSON.stringify(bestRoomTimes));
      scheduleCloudSave();
    } catch {
      // Split times are optional practice data.
    }
  }

  function recordRoomBest(index) {
    const current = bestRoomTimes[index] || 0;
    const target = ROOM_TARGETS[index] || 0;
    const result = roomSplitFeedbackData({
      elapsed: roomTime,
      previousBest: current,
      target,
      eligible: recordsEligible()
    });
    if (!result) return null;
    if (!result.eligible) return result;
    showSplitPopup(index, result);
    if (!result.isNewBest) return result;
    bestRoomTimes[index] = roomTime;
    writeRoomBests();
    saveRoomPath(index);
    refreshRoomSelectOptions();
    addFlow(42, "pb");
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.gold, 14, 210);
    return result;
  }

  function showSplitPopup(index, result) {
    const grade = splitGrade(result.elapsed, ROOM_TARGETS[index]);
    const suffix = grade ? ` · ${grade}` : "";
    if (result.kind === "first") {
      const comparison = result.referenceKind === "target" ? ` · 目标 ${formatDelta(result.delta)}` : "";
      splitPopupText = `首通 ${formatTime(result.elapsed)}${comparison}${suffix}`;
    } else if (result.kind === "pb") {
      splitPopupText = `PB ${formatTime(result.elapsed)} · ${formatDelta(result.delta)}${suffix}`;
    } else {
      const comparison = result.referenceKind === "pb" ? ` · PB ${formatDelta(result.delta)}` : "";
      splitPopupText = `本房 ${formatTime(result.elapsed)}${comparison}${suffix}`;
    }
    splitPopupAhead = result.kind === "first" || result.ahead;
    splitPopupTimer = SPLIT_POPUP_TIME;
  }

  function clearSplitPopup() {
    splitPopupTimer = 0;
    splitPopupText = "";
  }

  function readRoomPaths() {
    return readStoredJson(ROOM_PATHS_KEY, [], normalizeRoomPaths);
  }

  function normalizeRoomPaths(saved) {
    return normalizeRoomPathsData(saved, {
      roomCount: maps.length,
      maxPoints: MAX_ROOM_PATH_POINTS,
      tile: TILE,
      width: W,
      height: H
    });
  }

  function writeRoomPaths() {
    try {
      localStorage.setItem(ROOM_PATHS_KEY, JSON.stringify(bestRoomPaths));
      scheduleCloudSave();
    } catch {
      // Best paths are optional practice data.
    }
  }

  function saveRoomPath(index) {
    const path = roomPath.filter((point) => point.room === index);
    if (path.length < 2) return;
    bestRoomPaths[index] = downsamplePath(path, MAX_ROOM_PATH_POINTS).map((point) => ({
      x: Math.round(point.x * 10) / 10,
      y: Math.round(point.y * 10) / 10,
      dash: Boolean(point.dash),
      spark: Boolean(point.spark),
      over: Boolean(point.over),
      t: Math.round((Number(point.t) || 0) * 1000) / 1000
    }));
    writeRoomPaths();
  }

  function downsamplePath(path, maxPoints) {
    if (path.length <= maxPoints) return path;
    const step = (path.length - 1) / (maxPoints - 1);
    return Array.from({ length: maxPoints }, (_, i) => path[Math.round(i * step)]);
  }

  function moveAxis(axis, amount) {
    let remaining = amount;
    const step = Math.sign(remaining);
    while (Math.abs(remaining) > 0.0001) {
      const move = Math.abs(remaining) > 1 ? step : remaining;
      if (axis === "x") {
        player.x += move;
      } else {
        player.y += move;
      }

      if (collidesSolid(getPlayerBox())) {
        if (axis === "x") {
          if (player.dashTimer > 0 && tryDashCornerCorrection()) {
            remaining -= move;
            continue;
          }
          player.x -= move;
          player.vx = 0;
        } else {
          if (step < 0 && tryVerticalCornerCorrection()) {
            remaining -= move;
            continue;
          }
          player.y -= move;
          if (step > 0) {
            player.onGround = true;
            player.stamina = MAX_STAMINA;
            restoreDashCharge();
          }
          player.vy = 0;
        }
        return;
      }
      remaining -= move;
    }
  }

  function unstuckFromSolids() {
    if (!collidesSolid(getPlayerBox())) return;

    const originalX = player.x;
    const originalY = player.y;
    for (let radius = 1; radius <= 8; radius++) {
      const offsets = [
        [0, -radius],
        [-radius, 0],
        [radius, 0],
        [0, radius],
        [-radius, -radius],
        [radius, -radius],
        [-radius, radius],
        [radius, radius]
      ];
      for (const [ox, oy] of offsets) {
        player.x = originalX + ox;
        player.y = originalY + oy;
        if (!collidesSolid(getPlayerBox())) {
          player.vx = 0;
          player.vy = 0;
          return;
        }
      }
    }

    player.x = originalX;
    player.y = originalY;
  }

  function tryVerticalCornerCorrection() {
    const preferred = Math.sign(player.vx) || player.facing || 1;
    for (let i = 1; i <= CORNER_CORRECTION; i++) {
      const offsets = [preferred * i, -preferred * i];
      for (const offset of offsets) {
        player.x += offset;
        if (!collidesSolid(getPlayerBox())) {
          return true;
        }
        player.x -= offset;
      }
    }
    return false;
  }

  function tryDashCornerCorrection() {
    const preferred = Math.sign(player.vy) || -1;
    for (let i = 1; i <= DASH_CORNER_CORRECTION; i++) {
      const offsets = [preferred * i, -preferred * i];
      for (const offset of offsets) {
        player.y += offset;
        if (!collidesSolid(getPlayerBox())) {
          return true;
        }
        player.y -= offset;
      }
    }
    return false;
  }

  function chapterIndexForRoom(index) {
    return index < 3 ? 0 : index < 6 ? 1 : index < 8 ? 2 : 3;
  }

  function beginChapterEntry(room, fromChapter = -1) {
    chapterTransitionChapter = chapterIndexForRoom(room);
    chapterTransitionFromChapter = Number.isInteger(fromChapter) && fromChapter !== chapterTransitionChapter
      ? fromChapter
      : -1;
    chapterTransitionFromResult = chapterTransitionFromChapter >= 0
      ? chapterResultForTransition(chapterTransitionFromChapter)
      : null;
    chapterTransitionTimer = prefersReducedMotion
      ? chapterTransitionFromChapter >= 0 ? 1.2 : 0.9
      : CHAPTER_TRANSITION_TIME;
    clearAmbientVoices();
    ambientStep = 0;
    ambientNextTime = (audioContext?.currentTime || 0) + chapterTransitionTimer * 0.58;
    playChapterEntrySound(chapterTransitionChapter, chapterTransitionFromChapter);
  }

  function beginChapterTransition(fromRoom, toRoom) {
    const fromChapter = chapterIndexForRoom(fromRoom);
    const toChapter = chapterIndexForRoom(toRoom);
    if (toChapter === fromChapter) return;
    beginChapterEntry(toRoom, fromChapter);
  }

  function chapterResultForTransition(chapterIndex) {
    const roomIndexes = maps
      .map((_, index) => index)
      .filter((index) => chapterIndexForRoom(index) === chapterIndex);
    return chapterTransitionResultData({
      roomIndexes,
      roomTimes: runRoomTimes,
      roomMistakes
    });
  }

  function chapterTransitionResultText(result) {
    if (!result) return "章节收束";
    const assist = runUsedAssist ? "辅助 · " : "";
    const coverage = result.complete ? "" : `${result.visited}/${result.roomCount} 房 · `;
    const mistakes = result.mistakes > 0 ? `失误 ${result.mistakes}` : result.clean ? "无失误" : "失误 0";
    return `${assist}${coverage}${formatTime(result.seconds)} · ${mistakes}`;
  }

  function summitChapterResultText(result) {
    const chapter = CHAPTER_EXPERIENCE[chapterIndexForRoom(roomIndex)]?.title || "第四幕 · 星顶";
    return result ? `${chapter} · ${chapterTransitionResultText(result)}` : `${chapter} · 收束`;
  }

  function resolveRoomTransition() {
    if (player.x > W + 3 && roomIndex < maps.length - 1) {
      const clearedRoom = roomIndex;
      const clearedClean = roomAttemptClean;
      const masteryBefore = roomMasteryScore(clearedRoom);
      const roomResult = recordRoomBest(clearedRoom);
      markRoomClear(clearedRoom);
      const drillMode = activeDrill && activeDrill.room === clearedRoom ? activeDrill.mode : "";
      const drillResult = completeDrill(clearedRoom, clearedClean);
      if (drillResult === false) return;
      showMasteryPopup(clearedRoom, masteryBefore, clearedClean, drillResult === true ? drillMode : "", roomResult);
      roomIndex += 1;
      beginChapterTransition(clearedRoom, roomIndex);
      roomAttemptClean = true;
      room = parseRoom(roomIndex);
      resetRoomTech();
      lightTrails.length = 0;
      player.x = -player.w + 4;
      roomTime = 0;
      timingArmed = true;
      timingInputReady = true;
      roomIntroTimer = ROOM_INTRO_TIME;
      armRouteCue("下一房", null, ROUTE_CUE_TIME);
      player.respawnRoom = roomIndex;
      player.respawnX = 26;
      player.respawnY = Math.min(player.y, H - TILE * 3);
      echoAnchor = null;
      recallPulseTimer = 0;
      clearRecentPath();
      clearRoomPath();
      addFlow(26, "split");
      burst(28, player.y + player.h / 2, palette.cyan, 10, 170);
    }
    if (player.x < -player.w - 3 && roomIndex > 0) {
      roomIndex -= 1;
      room = parseRoom(roomIndex);
      resetRoomTech();
      lightTrails.length = 0;
      player.x = W - 5;
      roomTime = 0;
      timingArmed = true;
      timingInputReady = true;
      roomIntroTimer = ROOM_INTRO_TIME;
      armRouteCue("回看", null, ROUTE_CUE_TIME);
      player.respawnRoom = roomIndex;
      player.respawnX = player.x;
      player.respawnY = Math.min(player.y, H - TILE * 3);
      echoAnchor = null;
      recallPulseTimer = 0;
      clearRecentPath();
      clearRoomPath();
      burst(W - 28, player.y + player.h / 2, palette.cyan, 10, 170);
    }
  }

  function die(reason = "fall") {
    if (player.deadTimer > 0 || won) return;
    const deathReason = registerDeath(reason);
    setGameStatus(`${deathReasonLabel(deathReason)} · R${roomIndex + 1}，自动复位`);
    clearRecentPath();
    clearFocusPopup();
    resetRelayChain();
    breakFlow();
    clearSplitPopup();
    player.deadTimer = DEATH_RETRY_TIME;
    crumbleSlipTimer = 0;
    hitStopTimer = Math.max(hitStopTimer, DEATH_HITSTOP);
    triggerActionVisual("death", 0.28);
    playSound(reason === "crumble" ? "crumble" : "death");
    shake(0.2, 6.4);
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.hot, 16, 310);
    player.vx = 0;
    player.vy = 0;
  }

  function respawn() {
    roomIndex = player.respawnRoom;
    room = parseRoom(roomIndex);
    resetRoomTech();
    player.x = player.respawnX;
    player.y = player.respawnY;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.wasGrounded = false;
    player.wallDir = 0;
    player.wallCoyote = 0;
    player.wallCoyoteDir = 0;
    player.coyote = 0;
    clearInputBuffers(player);
    restoreDashCharge();
    player.stamina = MAX_STAMINA;
    player.dashTimer = 0;
    player.dashCooldown = 0;
    player.dashDirX = player.facing;
    player.dashDirY = 0;
    player.sparkHopTimer = 0;
    player.sparkHopDirX = player.facing;
    player.sparkHopDirY = 0;
    player.sparkHopVariant = "spark";
    player.wallJumpLock = 0;
    player.overdrive = 0;
    player.ghostTimer = 0;
    player.deadTimer = 0;
    clearSplitPopup();
    clearMasteryPopup();
    crumbleSlipTimer = 0;
    roomTime = 0;
    timingArmed = false;
    timingInputReady = false;
    ghosts.length = 0;
    lightTrails.length = 0;
    shards.length = 0;
    clearRecentPath();
    clearRoomPath();
    resetRelayChain();
    seedHair();
    resetActionVisuals();
    triggerActionVisual("spawn", 0.28);
    routeCueTimer = 0;
    routeCueReason = "";
    burst(player.x + player.w / 2, player.y + player.h / 2, "#f8fbff", 7, 190);
  }

  function quickRetry() {
    if (player.deadTimer > 0) return;
    const deathReason = registerDeath("retry");
    setGameStatus(`快速重开 · R${roomIndex + 1}`);
    clearFocusPopup();
    resetRelayChain();
    breakFlow();
    hitStopTimer = 0;
    shake(0.08, 3.4);
    respawn();
    updateHud();
  }

  function restartCurrentRoom() {
    if (player.deadTimer > 0) return;
    const deathReason = registerDeath("room");
    setGameStatus(`房间重开 · R${roomIndex + 1}`);
    clearFocusPopup();
    resetRelayChain();
    breakFlow();
    room = parseRoom(roomIndex);
    resetRoomTech();
    const checkpoint = room.entities.checkpoints[0];
    const target = checkpoint
      ? { x: checkpoint.x - player.w / 2, y: checkpoint.y + TILE / 2 - player.h }
      : room.entities.start;
    Object.assign(player, {
      x: target.x,
      y: target.y,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      wasGrounded: false,
      wallDir: 0,
      wallCoyote: 0,
      wallCoyoteDir: 0,
      overdrive: 0,
      stamina: MAX_STAMINA,
      dashes: player.lumenReserve ? 2 : 1,
      lumenReserve: player.lumenReserve,
      dashTimer: 0,
      dashCooldown: 0,
      dashDirX: 1,
      dashDirY: 0,
      ghostTimer: 0,
      coyote: 0,
      jumpBuffer: 0,
      dashBuffer: 0,
      sparkHopTimer: 0,
      sparkHopDirX: 1,
      sparkHopDirY: 0,
      sparkHopVariant: "spark",
      wallJumpLock: 0,
      deadTimer: 0,
      respawnRoom: roomIndex,
      respawnX: target.x,
      respawnY: target.y
    });
    clearSplitPopup();
    clearMasteryPopup();
    crumbleSlipTimer = 0;
    roomTime = 0;
    timingArmed = false;
    timingInputReady = false;
    hitStopTimer = 0;
    ghosts.length = 0;
    lightTrails.length = 0;
    particles.length = 0;
    shards.length = 0;
    clearRecentPath();
    clearRoomPath();
    seedHair();
    resetActionVisuals();
    triggerActionVisual("spawn", 0.24);
    routeCueTimer = 0;
    routeCueReason = "";
    const restartBurstCount = settings.calmEffects ? 7 : 12;
    burst(player.x + player.w / 2, player.y + player.h / 2, "#f8fbff", restartBurstCount, 210);
    updateHud();
  }

  function createDeathReasons() {
    return DEATH_REASON_KEYS.reduce((counts, key) => {
      counts[key] = 0;
      return counts;
    }, {});
  }

  function normalizeDeathReason(reason) {
    return DEATH_REASON_LABELS[reason] ? reason : "fall";
  }

  function registerDeath(reason) {
    const normalized = normalizeDeathReason(reason);
    deathCount += 1;
    deathReasons[normalized] = (deathReasons[normalized] || 0) + 1;
    lastDeathReason = normalized;
    trackRoomFault(normalized);
    return normalized;
  }

  function deathReasonLabel(reason) {
    return DEATH_REASON_LABELS[normalizeDeathReason(reason)] || "坠落";
  }

  function deathReasonSummary() {
    const parts = DEATH_REASON_KEYS
      .filter((key) => deathReasons[key] > 0)
      .map((key) => `${deathReasonLabel(key)} ${deathReasons[key]}`);
    return parts.length ? parts.join(" / ") : "clean";
  }

  function createRoomCounters() {
    return Array.from({ length: maps.length }, () => 0);
  }

  function createRoomTech() {
    return {
      spark: false,
      wallSpark: false,
      prismSpark: false,
      relay: false,
      relayChain: false,
      spring: false,
      updraft: false,
      prism: false,
      echo: false,
      recall: false,
      crumble: false
    };
  }

  function resetRoomTech() {
    roomTech = createRoomTech();
  }

  function markRoomTech(key) {
    if (roomTech[key] !== undefined) roomTech[key] = true;
  }

  function createRoomFocusEntry() {
    return createRoomFocusEntryData(ROOM_FOCUS_SCHEMA_VERSION, DEATH_REASON_KEYS);
  }

  function normalizeRoomFocus(raw) {
    return normalizeRoomFocusData(raw, {
      roomCount: maps.length,
      schemaVersion: ROOM_FOCUS_SCHEMA_VERSION,
      deathReasonKeys: DEATH_REASON_KEYS,
      deathReasonLabels: DEATH_REASON_LABELS
    });
  }

  function readRoomFocus() {
    let parsed = [];
    let repaired = false;
    try {
      parsed = JSON.parse(localStorage.getItem(ROOM_FOCUS_KEY) || "[]");
    } catch {
      markStorageIssue("本地存档已修复");
      repaired = true;
      parsed = [];
    }
    const normalized = normalizeRoomFocus(parsed);
    const envelope = {
      schemaVersion: ROOM_FOCUS_SCHEMA_VERSION,
      rooms: normalized
    };
    if (repaired || JSON.stringify(envelope) !== JSON.stringify(parsed)) {
      try {
        localStorage.setItem(ROOM_FOCUS_KEY, JSON.stringify(envelope));
      } catch {
        markStorageIssue("本地存档不可写");
      }
    }
    return normalized;
  }

  function writeRoomFocus() {
    try {
      localStorage.setItem(ROOM_FOCUS_KEY, JSON.stringify({
        schemaVersion: ROOM_FOCUS_SCHEMA_VERSION,
        rooms: roomFocus
      }));
      scheduleCloudSave();
    } catch {
      // Focus stats are optional practice data.
    }
  }

  function leadingRoomReason(entry) {
    return leadingRoomReasonData(entry, DEATH_REASON_KEYS, normalizeDeathReason);
  }

  function trackRoomFault(reason) {
    const normalized = normalizeDeathReason(reason);
    roomMistakes[roomIndex] = (roomMistakes[roomIndex] || 0) + 1;
    roomAttemptClean = false;
    if (!recordsEligible()) {
      showFocusPopup(roomIndex, normalized);
      return;
    }
    const entry = roomFocus[roomIndex] || createRoomFocusEntry();
    roomFocus[roomIndex] = recordRoomFaultData(entry, normalized);
    showFocusPopup(roomIndex, normalized);
    updatePracticeCoach();
    writeRoomFocus();
    refreshRoomSelectOptions();
  }

  function markRoomClear(index) {
    if (!recordsEligible()) {
      roomAttemptClean = true;
      return;
    }
    const entry = roomFocus[index] || createRoomFocusEntry();
    const clean = roomAttemptClean;
    roomFocus[index] = recordRoomClearData(entry, clean);
    roomAttemptClean = true;
    updatePracticeCoach();
    writeRoomFocus();
    syncChallengeWins();
    refreshRoomSelectOptions();
  }

  function trackDrillStart(index, mode = "auto") {
    if (!recordsEligible()) return;
    const entry = roomFocus[index] || createRoomFocusEntry();
    roomFocus[index] = recordDrillStartData(entry, mode);
    writeRoomFocus();
    refreshRoomSelectOptions();
  }

  function trackDrillClear(index, clean, mode = "auto") {
    const entry = roomFocus[index] || createRoomFocusEntry();
    roomFocus[index] = recordDrillClearData(entry, clean, mode);
    writeRoomFocus();
    syncChallengeWins();
    refreshRoomSelectOptions();
  }

  function showFocusPopup(index, reason) {
    const count = roomMistakes[index] || 0;
    focusPopupText = `重点 R${index + 1} ${deathReasonLabel(reason)} · 失误 ${count}`;
    focusPopupDetail = roomCoachHint(index, reason);
    focusPopupTimer = FOCUS_POPUP_TIME;
  }

  function clearFocusPopup() {
    focusPopupTimer = 0;
    focusPopupText = "";
    focusPopupDetail = "";
  }

  function roomSkillLabel(index) {
    const skills = ROOM_SKILLS[index] || [];
    return skills.length ? skills.map(skillLabel).join("+") : "路线";
  }

  function skillLabel(skill) {
    return SKILL_LABELS[skill] || skill;
  }

  function roomPurposeLabel(index) {
    return ROOM_PURPOSES[index] || ROOM_GUIDES[index] || "route practice";
  }

  function styleTrialForRoom(index) {
    return ROOM_STYLE_TRIALS[index] || {
      kind: "route",
      label: "路线判断",
      goal: roomPurposeLabel(index),
      clean: true,
      tech: [],
      timeScale: 1.5
    };
  }

  function styleTrialLabel(index) {
    return styleTrialForRoom(index).label || "类型挑战";
  }

  function styleTrialTimeLimit(index) {
    const trial = styleTrialForRoom(index);
    const target = ROOM_TARGETS[index] || 0;
    const scale = Number(trial.timeScale) || 0;
    return target > 0 && scale > 0 ? target * scale : 0;
  }

  function styleTrialTech(index) {
    const trial = styleTrialForRoom(index);
    return Array.isArray(trial.tech) ? trial.tech : [];
  }

  function missingStyleRequirements(index) {
    return styleTrialTech(index).filter((key) => !roomTech[key]);
  }

  function styleTrialObjective(index) {
    const trial = styleTrialForRoom(index);
    const parts = [`${styleTrialLabel(index)}：${trial.goal || roomPurposeLabel(index)}`];
    if (trial.clean) parts.push("无失误");
    const tech = styleTrialTech(index);
    if (tech.length) parts.push(tech.map(expertRequirementLabel).join("+"));
    const limit = styleTrialTimeLimit(index);
    if (limit > 0) parts.push(`≤${formatTime(limit)}`);
    return parts.join(" / ");
  }

  function styleTrialText(index) {
    return `类型 ${styleTrialObjective(index)}`;
  }

  function styleTrialReviewText(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    const status = entry.styleWins > 0 ? `已完成 ${entry.styleWins}/${entry.styleDrills}` : entry.styleDrills > 0 ? `尝试 ${entry.styleWins}/${entry.styleDrills}` : "未开练";
    return `${status} / ${styleTrialObjective(index)}`;
  }

  function roomRouteLine(index, slot) {
    const lines = ROOM_ROUTE_LINES[index] || [];
    return lines[slot] || lines[0] || roomPurposeLabel(index);
  }

  function routeLineCore(index, slot) {
    return roomRouteLine(index, slot).replace(/^(安全线|进阶线|高手线)：/, "");
  }

  function routeSlotForMode(mode) {
    if (mode === "clean") return 0;
    if (mode === "expert") return 2;
    return 1;
  }

  function routeSlotLabel(slot) {
    if (slot === 0) return "安全线";
    if (slot === 2) return "高手线";
    return "进阶线";
  }

  function routeSlotShort(slot) {
    if (slot === 0) return "稳健";
    if (slot === 2) return "高手";
    return "快速";
  }

  function routeSlotColor(slot) {
    if (slot === 0) return palette.green;
    if (slot === 2) return palette.cyan;
    return palette.gold;
  }

  function recommendedRouteSlot(index) {
    if (activeDrill && activeDrill.room === index) return routeSlotForMode(activeDrill.mode);
    const entry = roomFocus[index] || createRoomFocusEntry();
    const grade = splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]);
    if (entry.clean <= 0) return 0;
    if (grade !== "S") return 1;
    return 2;
  }

  function routeFocusReason(index, slot) {
    if (activeDrill && activeDrill.room === index) return `${drillModeLabel(activeDrill.mode)} 合同`;
    const score = roomMasteryScore(index);
    if (slot === 0) return "先稳无失误";
    if (slot === 1) return "追目标时间";
    return score >= 86 ? "冲 PB 线" : "补高手线";
  }

  function routeFocusData(index = roomIndex) {
    const active = activeDrill && activeDrill.room === index;
    const slot = active ? routeSlotForMode(activeDrill.mode) : routeCueTimer > 0 ? routeCueSlot : recommendedRouteSlot(index);
    const score = roomMasteryScore(index);
    const mode = active ? activeDrill.mode : resolveDrillMode(index);
    return {
      slot,
      color: routeSlotColor(slot),
      title: `R${index + 1} ${routeSlotLabel(slot)}`,
      line: roomRouteLine(index, slot),
      core: routeLineCore(index, slot),
      reason: routeCueReason || "路线",
      detail: `${routeFocusReason(index, slot)} / ${roomMasteryLevel(score)} ${score} / ${roomPaceLabel(index)}`,
      objective: active ? activeDrill.objective : drillObjectiveForRoom(index, mode)
    };
  }

  function routeCueActive() {
    return routeCueTimer > 0 || Boolean(activeDrill && activeDrill.room === roomIndex);
  }

  function armRouteCue(reason = "路线", slot = null, duration = ROUTE_CUE_TIME) {
    const resolved = Number.isInteger(slot) ? Math.max(0, Math.min(2, slot)) : recommendedRouteSlot(roomIndex);
    routeCueSlot = resolved;
    routeCueReason = reason;
    routeCueTimer = Math.max(routeCueTimer, duration);
  }

  function routeCompassTarget() {
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const points = [];
    const add = (x, y, label, weight = 0) => {
      if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y, label, weight });
    };
    room.entities.relays.forEach((relay, index) => {
      if (relay.ready) add(relay.x, relay.y, `光继 ${index + 1}`, 8);
    });
    room.entities.prisms.forEach((prism) => {
      if (prism.ready) add(prism.x, prism.y, "棱镜", 7);
    });
    room.entities.refills.forEach((refill) => {
      if (refill.ready) add(refill.x, refill.y, "补给", 6);
    });
    room.entities.springs.forEach((spring) => add(spring.x + spring.w / 2, spring.y, "弹簧", 5));
    room.entities.anchors.forEach((anchor) => add(anchor.x, anchor.y, "回声", 4));
    room.entities.updrafts.forEach((updraft) => add(updraft.x + updraft.w / 2, updraft.y + updraft.h * 0.2, "风", 3));
    if (room.entities.goal) add(room.entities.goal.x, room.entities.goal.y, "终点", 2);
    else add(W + 18, cy, "出口", 1);
    const ahead = points.filter((point) => point.x > cx + 12);
    const pool = ahead.length ? ahead : points;
    return pool.sort((a, b) => {
      const da = Math.hypot(a.x - cx, a.y - cy) - a.weight * 10;
      const db = Math.hypot(b.x - cx, b.y - cy) - b.weight * 10;
      return da - db;
    })[0] || null;
  }

  function showMasteryPopup(index, beforeScore, clean, drillMode = "", roomResult = null) {
    if (roomResult && !roomResult.eligible) {
      masteryPopupText = `R${index + 1} 辅助通过`;
      masteryPopupDetail = `${formatTime(roomResult.elapsed)} · 本次不计 PB、Clean 或训练记录`;
      masteryPopupTimer = MASTERY_POPUP_TIME;
      playSound("clear", 0.72);
      setGameStatus(`${masteryPopupText}：${masteryPopupDetail}`);
      return;
    }
    const afterScore = roomMasteryScore(index);
    const delta = Math.max(0, afterScore - beforeScore);
    const level = roomMasteryLevel(afterScore);
    const grade = splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]);
    const nextStep = nextMasteryStepText(index);
    const wins = [];
    if (roomResult?.isNewBest) wins.push("PB");
    if (clean) wins.push("CLEAN");
    if (drillMode) wins.push(`${drillModeLabel(drillMode)} Drill`);
    if (!wins.length) wins.push("CLEAR");
    masteryPopupText = delta > 0 ? `R${index + 1} 掌握 +${delta}` : `R${index + 1} ${level} ${afterScore}`;
    masteryPopupDetail = `${level} ${afterScore}/100 · ${wins.join(" · ")}${grade ? ` · ${grade}` : ""} · ${nextStep}`;
    masteryPopupTimer = MASTERY_POPUP_TIME;
    playSound("clear", clean ? 1 : 0.75);
    setGameStatus(`${masteryPopupText}：${masteryPopupDetail}`);
  }

  function clearMasteryPopup() {
    masteryPopupTimer = 0;
    masteryPopupText = "";
    masteryPopupDetail = "";
  }

  function roomMedalLabel(index) {
    const best = bestRoomTimes[index] || 0;
    const target = ROOM_TARGETS[index] || 0;
    const grade = splitGrade(best, target);
    if (!best) return `T ${formatTime(target)}`;
    return `${grade || "PB"} ${formatTime(best)}`;
  }

  function roomCleanText(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    if (entry.clears > 0) return `无失误 ${entry.clean}/${entry.clears}`;
    return "无失误 0/0";
  }

  function roomDrillText(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    if (entry.drills <= 0) return "Drill 0";
    return `Drill ${entry.drillClean}/${entry.drillClears}/${entry.drills}`;
  }

  function roomDrillContractText(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    return `C ${entry.cleanWins}/${entry.cleanDrills} · P ${entry.paceWins}/${entry.paceDrills} · S ${entry.styleWins}/${entry.styleDrills} · X ${entry.expertWins}/${entry.expertDrills}`;
  }

  function roomPaceLabel(index) {
    const best = bestRoomTimes[index] || 0;
    const target = ROOM_TARGETS[index] || 0;
    if (!best || !target) return "未游玩";
    const delta = best - target;
    if (delta <= 0) return "已达标";
    return `慢 ${formatDelta(delta)}`;
  }

  function roomTierLabel(index) {
    const tier = ROOM_TIERS[index] || "route";
    if (tier === "learn") return "教学";
    if (tier === "combine") return "组合";
    if (tier === "pressure") return "压力";
    if (tier === "finale") return "终盘";
    return tier;
  }

  function roomCoachHint(index, reason = "fall") {
    const normalized = normalizeDeathReason(reason);
    const guide = ROOM_GUIDES[index] || "把路线提前一个输入重建。";
    if (normalized === "spike") return `先读危险线；${guide}`;
    if (normalized === "crumble") return `踩上后立刻离开；${guide}`;
    if (normalized === "retry" || normalized === "room") return `重建开局节奏；${guide}`;
    return `稳定落点；${guide}`;
  }

  function roomSplitLoss(index) {
    const best = bestRoomTimes[index] || 0;
    const target = ROOM_TARGETS[index] || 0;
    if (!best || !target) return null;
    return best - target;
  }

  function routePracticeLine(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    const current = roomMistakes[index] || 0;
    const lead = leadingRoomReason(entry);
    const loss = roomSplitLoss(index);
    const grade = splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]);
    if (current > 0) return roomCoachHint(index, lead);
    if (entry.faults >= 3 && entry.faults - entry.clean * 2 > 0) return roomCoachHint(index, lead);
    if (entry.clean <= 0) return roomRouteLine(index, 0);
    if (loss !== null && loss > 1.5) return roomRouteLine(index, 1);
    if (grade === "S") return roomRouteLine(index, 2);
    return roomRouteLine(index, 1);
  }

  function roomPracticeReason(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    const current = roomMistakes[index] || 0;
    const lead = leadingRoomReason(entry);
    const loss = roomSplitLoss(index);
    if (current > 0) return `本轮失误 ${current}`;
    if (entry.faults > 0 && entry.faults - entry.clean * 2 > 0) return `${deathReasonLabel(lead)} ${entry[lead] || 0}/${entry.faults}`;
    if (loss === null) return "未通关";
    if (loss > 0) return `慢 ${formatDelta(loss)}`;
    return "冲高手线";
  }

  function roomTrainingAdvice(index) {
    return `R${index + 1} ${ROOM_NAMES[index] || "Summit"}：${roomPracticeReason(index)}；${routePracticeLine(index)}`;
  }

  function roomFocusScore(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    const current = roomMistakes[index] || 0;
    return roomFocusScoreData(entry, current);
  }
  function roomSelectFocusLabel(index) {
    const current = roomMistakes[index] || 0;
    if (current > 0) return ` / 失误 ${current}`;
    const entry = roomFocus[index] || createRoomFocusEntry();
    const pressure = entry.faults - entry.clean * 2;
    if (entry.faults >= 3 && pressure > 0) {
      return ` / 关注 ${deathReasonLabel(leadingRoomReason(entry))}`;
    }
    return "";
  }

  function roomFocusDetails(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    const current = roomMistakes[index] || 0;
    const lead = leadingRoomReason(entry);
    const run = current > 0 ? `本轮失误 ${current}` : "本轮无失误";
    const saved = entry.faults > 0 ? `档案${deathReasonLabel(lead)} ${entry[lead] || 0}/${entry.faults}` : "档案无失误";
    const clears = entry.clears > 0 ? `无失误 ${entry.clean}/${entry.clears}` : "无失误 0/0";
    return `${run} / ${saved} / ${clears} / ${roomDrillText(index)} / ${roomDrillContractText(index)} / ${roomPaceLabel(index)} / ${roomTierLabel(index)} / ${styleTrialText(index)} / ${roomSkillLabel(index)} / ${roomPurposeLabel(index)} / ${roomRouteLine(index, 0)} / ${roomRouteLine(index, 1)} / ${roomRouteLine(index, 2)} / ${ROOM_GUIDES[index] || ""}`;
  }

  function strongestFocusRoom() {
    let best = { index: -1, score: 0, reason: "fall" };
    maps.forEach((_, index) => {
      const entry = roomFocus[index] || createRoomFocusEntry();
      const current = roomMistakes[index] || 0;
      const score = roomFocusScore(index);
      if (score > best.score) {
        best = { index, score, reason: leadingRoomReason(entry) };
      }
    });
    return best.index >= 0 && best.score >= 2 ? best : null;
  }

  function focusSummary() {
    const focus = strongestFocusRoom();
    if (!focus) return "";
    const current = roomMistakes[focus.index] || 0;
    const detail = current > 0 ? `失误 ${current}` : `压力 ${focus.score}`;
    return ` / 重点 R${focus.index + 1} ${deathReasonLabel(focus.reason)} ${detail}`;
  }

  function recommendedPracticeRoom() {
    const focus = strongestFocusRoom();
    if (focus) return focus.index;
    const unplayed = maps.findIndex((_, index) => !(bestRoomTimes[index] > 0));
    if (unplayed >= 0) return unplayed;
    const nonS = maps.findIndex((_, index) => splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]) !== "S");
    if (nonS >= 0) return nonS;
    let candidate = 0;
    let closest = -Infinity;
    maps.forEach((_, index) => {
      const target = ROOM_TARGETS[index] || 1;
      const ratio = (bestRoomTimes[index] || 0) / target;
      if (ratio > closest) {
        closest = ratio;
        candidate = index;
      }
    });
    return candidate;
  }

  function practiceTargetRoom() {
    const selected = Number(roomSelect?.value);
    if (Number.isInteger(selected) && selected >= 0 && selected < maps.length) return selected;
    return recommendedPracticeRoom();
  }

  function drillModeLabel(mode = "auto") {
    if (mode === "clean") return "Clean";
    if (mode === "pace") return "Pace";
    if (mode === "style") return "Style";
    if (mode === "expert") return "Expert";
    return "Auto";
  }

  function resolveDrillMode(index, mode = "auto") {
    if (mode === "clean" || mode === "pace" || mode === "style" || mode === "expert") return mode;
    return roomReviewMode(index);
  }

  function expertRequirementsForRoom(index) {
    return Array.isArray(EXPERT_REQUIREMENTS[index]) ? EXPERT_REQUIREMENTS[index] : [];
  }

  function expertRequirementLabel(key) {
    return EXPERT_REQUIREMENT_LABELS[key] || key;
  }

  function missingExpertRequirements(index) {
    return expertRequirementsForRoom(index).filter((key) => !roomTech[key]);
  }

  function expertRequirementsMet(index) {
    return missingExpertRequirements(index).length === 0;
  }

  function expertRequirementText(index) {
    const requirements = expertRequirementsForRoom(index);
    return requirements.length ? `高手动作：${requirements.map(expertRequirementLabel).join("+")}` : "高手动作：自由路线";
  }

  function drillTargetText(index, mode = "auto") {
    const resolvedMode = resolveDrillMode(index, mode);
    const target = ROOM_TARGETS[index] || 0;
    if (resolvedMode === "clean") return "目标：无失误通过";
    if (resolvedMode === "pace") return `目标：${formatTime(target)} 内通关`;
    if (resolvedMode === "style") return `目标：${styleTrialLabel(index)}挑战`;
    if (resolvedMode === "expert") return `目标：S + 无失误 + 高手动作`;
    return "目标：完成推荐路线";
  }

  function drillObjectiveForRoom(index, mode = "auto") {
    const resolvedMode = resolveDrillMode(index, mode);
    if (resolvedMode === "clean") return `无失误：${routeLineCore(index, 0)}`;
    if (resolvedMode === "pace") return `达标 ${formatTime(ROOM_TARGETS[index] || 0)}：${routeLineCore(index, 1)}`;
    if (resolvedMode === "style") return styleTrialObjective(index);
    if (resolvedMode === "expert") return `高手线：${routeLineCore(index, 2)} / ${expertRequirementText(index)}`;
    const entry = roomFocus[index] || createRoomFocusEntry();
    const lead = leadingRoomReason(entry);
    const grade = splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]);
    const current = roomMistakes[index] || 0;
    const pressure = entry.faults - entry.clean * 2;
    if (current > 0) return `稳定 ${deathReasonLabel(lead)} 后的恢复`;
    if (entry.faults >= 3 && pressure > 0) return `减少 ${deathReasonLabel(lead)} 失误`;
    if (entry.clean <= 0) return roomRouteLine(index, 0);
    if (grade !== "S") return roomRouteLine(index, 1);
    return roomRouteLine(index, 2);
  }

  function drillBriefText(index, mode = "auto") {
    const resolvedMode = resolveDrillMode(index, mode);
    const target = drillTargetText(index, resolvedMode);
    if (resolvedMode === "clean") return `${target} · 路线：${routeLineCore(index, 0)}`;
    if (resolvedMode === "pace") return `${target} · 路线：${routeLineCore(index, 1)}`;
    if (resolvedMode === "style") return `${target} · ${styleTrialObjective(index)}`;
    if (resolvedMode === "expert") return `${target} · 路线：${routeLineCore(index, 2)} · ${expertRequirementText(index)}`;
    return `${target} · ${drillObjectiveForRoom(index, resolvedMode)}`;
  }

  function startRoomDrill(index, mode = "auto", options = {}) {
    const resolvedMode = resolveDrillMode(index, mode);
    const objective = drillObjectiveForRoom(index, resolvedMode);
    if (!options.keepRoute) cancelActiveRouteContract("改练中断");
    if (options.feelFixture && activeFeelFixture && activeFeelFixture.id !== options.feelFixture) cancelActiveFeelFixture("改练中断");
    if (!options.keepFeel && !options.feelFixture) cancelActiveFeelFixture("改练中断");
    jumpToRoom(index, {
      keepDrill: true,
      keepRoute: Boolean(options.keepRoute),
      keepFeel: Boolean(options.keepFeel || options.feelFixture),
      chapterEntry: true
    });
    activeDrill = createDrillData(index, resolvedMode, objective, ROOM_TARGETS[index] || 0);
    if (options.feelFixture) activeFeelFixture = { id: options.feelFixture, room: index, mode: resolvedMode };
    armRouteCue("Drill", routeSlotForMode(resolvedMode), ROUTE_CUE_TIME + 1.2);
    trackDrillStart(index, resolvedMode);
    clearFocusPopup();
    setGameStatus(`${drillModeLabel(resolvedMode)} Drill R${index + 1}：${objective}`);
    updatePracticeCoach();
  }

  function completeDrill(index, clean) {
    if (!activeDrill || activeDrill.room !== index) return null;
    if (!recordsEligible()) {
      activeDrill = null;
      cancelActiveRouteContract("辅助练习不计合同");
      cancelActiveFeelFixture("辅助练习不计校准");
      focusPopupText = `辅助练习完成 R${index + 1}`;
      focusPopupDetail = "本次不计 PB、挑战或训练合同";
      focusPopupTimer = FOCUS_POPUP_TIME;
      setGameStatus("辅助练习完成 · 未计入训练档案");
      updatePracticeCoach();
      return true;
    }
    const success = drillSucceeded(activeDrill, clean, roomTime);
    if (success) {
      const mode = activeDrill.mode;
      trackDrillClear(index, clean, mode);
      const stats = drillContractStats(index, mode);
      focusPopupText = `${clean ? "DRILL 无失误" : "DRILL 通过"} R${index + 1}`;
      focusPopupDetail = `${drillContractStatus(stats)} / ${roomMasteryLevel(roomMasteryScore(index))} ${roomMasteryScore(index)} / ${nextMasteryStepText(index)}`;
      focusPopupTimer = FOCUS_POPUP_TIME;
      armRouteCue("完成", routeSlotForMode(mode), ROUTE_CUE_TIME * 0.72);
      const routeAdvanced = advanceRouteContract(index, mode);
      completeActiveFeelFixture(index, mode, clean, roomTime);
      activeDrill = null;
      setGameStatus(`Drill R${index + 1} 完成`);
      updatePracticeCoach();
      if (routeAdvanced) return false;
      return true;
    }
    retryFailedDrill({ ...activeDrill }, drillFailureText(activeDrill, clean, roomTime));
    return false;
  }

  function retryFailedDrill(drill, reason) {
    const keepRoute = routeContractMatchesDrill(drill);
    const keepFeel = feelFixtureMatchesDrill(drill);
    if (activeRouteContract && !keepRoute) cancelActiveRouteContract("状态不匹配");
    if (activeFeelFixture && !keepFeel) cancelActiveFeelFixture("状态不匹配");
    jumpToRoom(drill.room, { keepDrill: true, keepRoute, keepFeel });
    activeDrill = drill;
    trackDrillStart(drill.room, drill.mode);
    focusPopupText = `${drillModeLabel(drill.mode)} 重练 R${drill.room + 1}`;
    focusPopupDetail = reason;
    focusPopupTimer = FOCUS_POPUP_TIME;
    playSound("ui", 0.8);
    setGameStatus(`${drillModeLabel(drill.mode)} Drill 重练：${reason}`);
    updatePracticeCoach();
  }

  function drillSucceeded(drill, clean, elapsed) {
    return drillSucceededData(drill, {
      clean,
      elapsed,
      styleSucceeded: drill.mode === "style" && styleTrialSucceeded(drill.room, clean, elapsed),
      expertRequirementsMet: drill.mode === "expert" && expertRequirementsMet(drill.room)
    });
  }

  function styleTrialSucceeded(index, clean, elapsed) {
    const trial = styleTrialForRoom(index);
    const limit = styleTrialTimeLimit(index);
    if (trial.clean && !clean) return false;
    if (missingStyleRequirements(index).length > 0) return false;
    return limit <= 0 || elapsed <= limit;
  }

  function drillFailureText(drill, clean, elapsed) {
    const next = `下一次：${routeLineCore(drill.room, drill.mode === "expert" ? 2 : drill.mode === "clean" ? 0 : 1)}`;
    if (drill.mode === "clean") return `本轮有失误 / ${next}`;
    if (drill.mode === "pace") return `慢 ${formatDelta(elapsed - drill.target)} / ${next}`;
    if (drill.mode === "style") {
      const trial = styleTrialForRoom(drill.room);
      const missing = missingStyleRequirements(drill.room);
      const limit = styleTrialTimeLimit(drill.room);
      if (trial.clean && !clean) return `${styleTrialLabel(drill.room)} 要求无失误 / ${next}`;
      if (missing.length) return `缺类型动作：${missing.map(expertRequirementLabel).join("+")} / ${next}`;
      if (limit > 0 && elapsed > limit) return `慢 ${formatDelta(elapsed - limit)} / ${next}`;
      return styleTrialObjective(drill.room);
    }
    if (drill.mode === "expert") {
      const missing = missingExpertRequirements(drill.room);
      if (!clean) return `Expert 要求无失误 / ${next}`;
      if (drill.target > 0 && elapsed > drill.target) return `慢 ${formatDelta(elapsed - drill.target)} / ${next}`;
      if (missing.length) return `缺高手动作：${missing.map(expertRequirementLabel).join("+")} / ${next}`;
      return clean ? `用时 ${formatTime(elapsed)} / S ${formatTime(drill.target)}` : "Expert 要求 S + 无失误";
    }
    return drill.objective;
  }

  function practiceCoachText() {
    if (activeDrill && activeDrill.room === roomIndex) {
      return `${drillModeLabel(activeDrill.mode)} R${activeDrill.room + 1} · ${activeDrill.objective}${roomMistakes[activeDrill.room] ? ` · 失误 ${roomMistakes[activeDrill.room]}` : ""}`;
    }
    const target = practiceTargetRoom();
    const entry = roomFocus[target] || createRoomFocusEntry();
    const reason = entry.faults > 0 ? leadingRoomReason(entry) : "fall";
    const score = roomFocusScore(target);
    const mode = resolveDrillMode(target);
    const marker = score > 0 ? `复盘 ${deathReasonLabel(reason)} ${score}` : `${drillModeLabel(mode)} 合同`;
    return `${marker} / ${roomTrainingAdvice(target)}`;
  }

  function updatePracticeCoach() {
    if (focusRoomButton) {
      const target = practiceTargetRoom();
      const mode = resolveDrillMode(target);
      const label = `开始 R${target + 1} ${drillModeLabel(mode)}`;
      if (focusRoomButton.textContent !== label) focusRoomButton.textContent = label;
      focusRoomButton.title = drillBriefText(target, mode);
    }
    updatePracticePlan();
    updateRouteContracts();
    updateFeelLab();
    updateDrillVariantButtons();
    updateFocusResetButton();
    if (practiceReport) {
      practiceReport.textContent = practiceReportText();
    }
    updateChapterOverview();
    updatePracticeQueue();
    updateChallengeBoard();
    updateProfileSummary();
    updatePracticeLedger();
  }

  function countRoomsWhere(predicate) {
    return maps.reduce((sum, _, index) => sum + (predicate(index) ? 1 : 0), 0);
  }

  function cleanRoomCount() {
    return countRoomsWhere((index) => (roomFocus[index]?.clean || 0) > 0);
  }

  function sRankRoomCount() {
    return countRoomsWhere((index) => splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]) === "S");
  }

  function styleWinRoomCount() {
    return countRoomsWhere((index) => (roomFocus[index]?.styleWins || 0) > 0);
  }

  function expertWinRoomCount() {
    return countRoomsWhere((index) => (roomFocus[index]?.expertWins || 0) > 0);
  }

  function clearedRoomCount() {
    return countRoomsWhere((index) => (roomFocus[index]?.clears || 0) > 0 || (bestRoomTimes[index] || 0) > 0);
  }

  function contractWinCount() {
    return roomFocus.reduce((sum, entry) => {
      return sum + (entry?.cleanWins || 0) + (entry?.paceWins || 0) + (entry?.styleWins || 0) + (entry?.expertWins || 0);
    }, 0);
  }

  function chapterCompletionData() {
    const roomTotal = maps.length;
    const clear = clearedRoomCount();
    const clean = cleanRoomCount();
    const pace = sRankRoomCount();
    const style = styleWinRoomCount();
    const expert = expertWinRoomCount();
    const mastery = maps.reduce((sum, _, index) => sum + roomMasteryScore(index), 0) / Math.max(1, roomTotal);
    return chapterCompletionModelData({
      roomTotal,
      clear,
      clean,
      pace,
      style,
      expert,
      mastery
    });
  }

  function updateChapterOverview() {
    if (!chapterOverview || !settingsVisible) return;
    const data = chapterCompletionData();
    const grade = chapterGrade(data.percent);
    const html = `<div class="chapter-head"><span>章节完成度</span><strong>${escapeHtml(grade)} · ${data.percent}%</strong></div>`
      + `<div class="chapter-meter" style="--chapter-progress: ${data.percent}%" aria-hidden="true"></div>`
      + `<div class="chapter-stats">`
      + `<span><b>${data.clear}</b><em>通关房</em></span>`
      + `<span><b>${data.clean}</b><em>Clean</em></span>`
      + `<span><b>${data.pace}</b><em>S</em></span>`
      + `<span><b>${data.style}</b><em>Style</em></span>`
      + `<span><b>${data.expert}</b><em>Expert</em></span>`
      + `</div>`;
    if (html === lastChapterOverviewHtml) return;
    lastChapterOverviewHtml = html;
    chapterOverview.innerHTML = html;
  }

  function nextContractMode(mode) {
    if (mode === "clean") return "pace";
    if (mode === "pace") return "style";
    if (mode === "style") return "expert";
    return "style";
  }

  function contractPlanLabel(mode) {
    if (mode === "clean") return "稳";
    if (mode === "pace") return "快";
    if (mode === "style") return "变";
    if (mode === "expert") return "极";
    return "练";
  }

  function complementaryPracticeTarget(index, mode) {
    const nextMode = nextContractMode(mode);
    if (nextMode === "style") {
      const entry = roomFocus[index] || createRoomFocusEntry();
      if (entry.clean > 0 || bestRoomTimes[index] > 0) return { index, mode: nextMode };
      return { index: stylePracticeRoom(), mode: nextMode };
    }
    if (nextMode === "expert") {
      const entry = roomFocus[index] || createRoomFocusEntry();
      const ready = splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]) === "S" && entry.clean > 0 && entry.styleWins > 0;
      return { index: ready ? index : expertPracticeRoom(), mode: nextMode };
    }
    return { index, mode: nextMode };
  }

  function practicePlanSteps() {
    const firstIndex = recommendedPracticeRoom();
    const firstMode = resolveDrillMode(firstIndex);
    const second = complementaryPracticeTarget(firstIndex, firstMode);
    const thirdRow = practiceLedgerRows().find((row) => row.index !== firstIndex || row.mode !== firstMode) || {
      index: firstIndex,
      mode: "expert",
      score: roomMasteryScore(firstIndex),
      level: roomMasteryLevel(roomMasteryScore(firstIndex))
    };
    return [
      {
        label: "现在",
        index: firstIndex,
        mode: firstMode,
        reason: roomPracticeReason(firstIndex),
        title: "修最短板",
        objective: drillObjectiveForRoom(firstIndex, firstMode)
      },
      {
        label: "接着",
        index: second.index,
        mode: second.mode,
        reason: drillContractStatus(drillContractStats(second.index, second.mode)),
        title: "换一种能力",
        objective: drillObjectiveForRoom(second.index, second.mode)
      },
      {
        label: "然后",
        index: thirdRow.index,
        mode: thirdRow.mode,
        reason: `${thirdRow.level || roomMasteryLevel(roomMasteryScore(thirdRow.index))} ${thirdRow.score ?? roomMasteryScore(thirdRow.index)}`,
        title: "补路线链",
        objective: drillObjectiveForRoom(thirdRow.index, thirdRow.mode)
      }
    ];
  }

  function updatePracticePlan() {
    if (!practicePlan || !settingsVisible) return;
    const steps = practicePlanSteps();
    const html = `<div class="plan-head"><span>训练计划</span><em>短板 → 类型 → 高手线</em></div>`
      + steps.map((step, index) => {
        const stats = drillContractStats(step.index, step.mode);
        const progress = drillContractProgress(stats);
        const title = `R${step.index + 1} ${ROOM_NAMES[step.index] || "Summit"}`;
        return `<button class="plan-step ${escapeHtml(step.mode)}" type="button" data-plan-room="${step.index}" data-plan-mode="${escapeHtml(step.mode)}" aria-label="${escapeHtml(step.label)} ${escapeHtml(title)} ${escapeHtml(step.objective)}" style="--plan-progress: ${progress}%">`
          + `<span class="plan-index">${String(index + 1).padStart(2, "0")}</span>`
          + `<span class="plan-main"><b>${escapeHtml(step.label)} · ${escapeHtml(contractPlanLabel(step.mode))} ${escapeHtml(drillModeLabel(step.mode))}</b><strong>${escapeHtml(title)}</strong><em>${escapeHtml(step.title)} · ${escapeHtml(step.reason)}</em><small>${escapeHtml(step.objective)}</small></span>`
          + `<i class="plan-meter" aria-hidden="true"></i>`
          + `</button>`;
      }).join("");
    if (html === lastPracticePlanHtml) return;
    lastPracticePlanHtml = html;
    practicePlan.innerHTML = html;
  }

  function findRouteContractById(id) {
    return ROUTE_CONTRACTS.find((contract) => contract.id === id) || null;
  }

  function rejectTrainingEntry(label) {
    setGameStatus(`${label} 入口失效，请刷新页面后重试`);
    showGameTip("训练入口失效", "请刷新页面后重新打开设置面板", "death", GAME_TIP_TIME, 3);
    focusGame();
  }

  function clearRouteContractStepTimer() {
    if (!routeContractStepTimer) return;
    window.clearTimeout(routeContractStepTimer);
    routeContractStepTimer = 0;
  }

  function nextRouteContractGeneration() {
    clearRouteContractStepTimer();
    routeContractGeneration = (routeContractGeneration + 1) % Number.MAX_SAFE_INTEGER;
    return routeContractGeneration;
  }

  function routeContractStepLabel(step) {
    return `R${step.index + 1} ${drillModeLabel(step.mode)}`;
  }

  function routeContractProgress(contract) {
    const wins = contract.steps.filter((step) => drillContractStats(step.index, step.mode).wins > 0).length;
    return Math.round((wins / Math.max(1, contract.steps.length)) * 100);
  }

  function cancelActiveRouteContract(reason = "已中断") {
    if (!activeRouteContract) return false;
    clearRouteContractStepTimer();
    const result = createRouteInterruptionResultData(
      activeRouteContract,
      ROUTE_CONTRACTS,
      reason,
      routeContractStepLabel
    );
    lastRouteContractResult = result;
    activeRouteContract = null;
    nextRouteContractGeneration();
    return true;
  }

  function activeRouteContractData() {
    return activeRouteContractDataFor(activeRouteContract, ROUTE_CONTRACTS);
  }

  function routeContractMatchesDrill(drill) {
    return routeContractMatchesDrillData(activeRouteContract, ROUTE_CONTRACTS, drill);
  }

  function routeContractSummaryText() {
    const active = activeRouteContractData();
    const next = ROUTE_CONTRACTS.find((contract) => routeContractProgress(contract) < 100) || ROUTE_CONTRACTS[0];
    return routeContractSummaryTextData({
      active,
      lastResult: lastRouteContractResult,
      nextContract: next,
      nextProgress: routeContractProgress(next),
      stepLabel: routeContractStepLabel
    });
  }

  function routeContractResumeStep(contract) {
    return routeContractResumeStepData(lastRouteContractResult, contract);
  }

  function updateRouteContracts() {
    if (!routeContracts || !settingsVisible) return;
    const html = `<div class="route-contract-head"><span>航线合同</span><em>三步连练 · 自动推进</em></div>`
      + ROUTE_CONTRACTS.map((contract) => {
        const progress = routeContractProgress(contract);
        const steps = contract.steps.map(routeContractStepLabel).join(" → ");
        const active = activeRouteContract && activeRouteContract.id === contract.id;
        const resumeStep = routeContractResumeStep(contract);
        const resumable = resumeStep >= 0;
        const done = progress >= 100;
        return `<button class="route-contract-card ${active ? "active" : ""} ${done ? "done" : ""} ${resumable ? "interrupted" : ""}" type="button" data-route-contract="${escapeHtml(contract.id)}"${resumable ? ` data-route-resume="${escapeHtml(contract.id)}"` : ""} aria-label="${escapeHtml(contract.label)} ${escapeHtml(resumable ? `继续上次 ${resumeStep + 1}/${contract.steps.length}` : contract.goal)}">`
          + `${resumable ? `<span class="route-resume-badge">继续上次 ${resumeStep + 1}/${contract.steps.length}</span>` : ""}`
          + `<strong>${escapeHtml(contract.label)} · ${resumable ? "继续" : done ? "完成" : `${progress}%`}</strong>`
          + `<em>${escapeHtml(steps)}</em>`
          + `<small>${escapeHtml(resumable ? lastRouteContractResult.detail : contract.goal)}</small>`
          + `</button>`;
      }).join("");
    if (html === lastRouteContractsHtml) return;
    lastRouteContractsHtml = html;
    routeContracts.innerHTML = html;
  }

  function startRouteContract(id, stepIndex = 0) {
    const contract = findRouteContractById(id);
    if (!contract) {
      rejectTrainingEntry("航线合同");
      return false;
    }
    if (activeRouteContract) cancelActiveRouteContract("切换航线");
    activeRouteContract = createRouteContractStateData(contract, stepIndex, nextRouteContractGeneration());
    if (!activeRouteContract) {
      rejectTrainingEntry("航线合同");
      return false;
    }
    lastRouteContractResult = null;
    startRouteContractStep();
    return true;
  }

  function resumeRouteContract(id) {
    const contract = findRouteContractById(id);
    if (!contract) {
      rejectTrainingEntry("航线合同");
      return false;
    }
    const step = routeContractResumeStep(contract);
    return startRouteContract(contract.id, step >= 0 ? step : 0);
  }

  function startRouteContractStep(expectedGeneration = activeRouteContract?.generation) {
    if (!activeRouteContract) return;
    if (activeRouteContract.generation !== expectedGeneration) return;
    const data = activeRouteContractData();
    if (!data) {
      activeRouteContract = null;
      nextRouteContractGeneration();
      return;
    }
    const { contract, step } = data;
    startRoomDrill(step.index, step.mode, { keepRoute: true });
    focusPopupText = `${contract.label} ${activeRouteContract.step + 1}/${contract.steps.length}`;
    focusPopupDetail = `${routeContractStepLabel(step)} / ${drillObjectiveForRoom(step.index, step.mode)}`;
    focusPopupTimer = FOCUS_POPUP_TIME;
    setGameStatus(`${contract.label}：${routeContractStepLabel(step)}`);
  }

  function advanceRouteContract(index, mode) {
    if (!activeRouteContract) return false;
    const data = activeRouteContractData();
    if (!data) {
      activeRouteContract = null;
      nextRouteContractGeneration();
      return false;
    }
    const { contract } = data;
    const advancement = advanceRouteContractData(activeRouteContract, contract, index, mode);
    if (!advancement.matched) return false;
    activeRouteContract = advancement.state;
    const next = advancement.next;
    if (advancement.done) {
      focusPopupText = `${contract.label} 完成`;
      focusPopupDetail = contract.goal;
      focusPopupTimer = FOCUS_POPUP_TIME;
      lastRouteContractResult = createRouteCompletionResultData(contract);
      activeRouteContract = null;
      nextRouteContractGeneration();
      updatePracticeCoach();
      return false;
    }
    const nextStep = activeRouteContract.step + 1;
    const generation = activeRouteContract.generation;
    const expectedStep = activeRouteContract.step;
    focusPopupText = `${contract.label} 下一步 ${nextStep}/${contract.steps.length}`;
    focusPopupDetail = `${routeContractStepLabel(next)} / ${drillObjectiveForRoom(next.index, next.mode)}`;
    focusPopupTimer = FOCUS_POPUP_TIME;
    clearRouteContractStepTimer();
    routeContractStepTimer = window.setTimeout(() => {
      routeContractStepTimer = 0;
      if (!activeRouteContract || activeRouteContract.id !== contract.id || activeRouteContract.step !== expectedStep || activeRouteContract.generation !== generation) return;
      startRouteContractStep(generation);
    }, 80);
    return true;
  }

  function findFeelFixtureById(id) {
    return FEEL_REPLAY_FIXTURES.find((fixture) => fixture.id === id) || null;
  }

  function feelFixtureMode(fixture) {
    return feelFixtureModeData(fixture);
  }

  function feelFixtureStats(fixture) {
    const index = Math.max(0, Math.min(maps.length - 1, Number(fixture.room) - 1));
    return drillContractStats(index, feelFixtureMode(fixture));
  }

  function feelFixtureLabel(fixture) {
    const index = Math.max(0, Math.min(maps.length - 1, Number(fixture.room) - 1));
    return `R${index + 1} ${drillModeLabel(feelFixtureMode(fixture))}`;
  }

  function feelFixtureMatchesDrill(drill) {
    return feelFixtureMatchesDrillData(activeFeelFixture, drill);
  }

  function cancelActiveFeelFixture(reason = "已中断") {
    if (!activeFeelFixture) return false;
    const result = createFeelInterruptionResultData(activeFeelFixture, FEEL_REPLAY_FIXTURES, reason);
    lastFeelFixtureResult = result;
    activeFeelFixture = null;
    return true;
  }

  function completeActiveFeelFixture(index, mode, clean, elapsed) {
    const result = createFeelCompletionResultData(activeFeelFixture, FEEL_REPLAY_FIXTURES, {
      room: index,
      mode,
      clean,
      elapsed,
      formatTime
    });
    if (!result) return false;
    lastFeelFixtureResult = result;
    activeFeelFixture = null;
    return true;
  }

  function feelFixtureStatusText(fixture, fallback) {
    return feelFixturePresentationData(fixture, activeFeelFixture, lastFeelFixtureResult, fallback).status;
  }

  function feelFixtureDetailText(fixture) {
    return feelFixturePresentationData(fixture, activeFeelFixture, lastFeelFixtureResult, "").detail;
  }

  function feelFixtureCardClass(fixture) {
    return feelFixturePresentationData(fixture, activeFeelFixture, lastFeelFixtureResult, "").className;
  }

  function feelLabItems() {
    return [...FEEL_REPLAY_FIXTURES].sort((a, b) => {
      const aActive = activeFeelFixture && activeFeelFixture.id === a.id ? -3 : lastFeelFixtureResult && lastFeelFixtureResult.id === a.id ? -2 : 0;
      const bActive = activeFeelFixture && activeFeelFixture.id === b.id ? -3 : lastFeelFixtureResult && lastFeelFixtureResult.id === b.id ? -2 : 0;
      if (aActive !== bActive) return aActive - bActive;
      const aStats = feelFixtureStats(a);
      const bStats = feelFixtureStats(b);
      const aScore = (aStats.wins > 0 ? 2 : aStats.starts > 0 ? 1 : 0);
      const bScore = (bStats.wins > 0 ? 2 : bStats.starts > 0 ? 1 : 0);
      return aScore - bScore || a.room - b.room;
    }).slice(0, 4);
  }

  function updateFeelLab() {
    if (!feelLab || !settingsVisible) return;
    const recent = activeFeelFixture
      ? `进行中 ${activeFeelFixture.id}`
      : lastFeelFixtureResult
        ? `${lastFeelFixtureResult.done ? "刚完成" : "已中断"} ${lastFeelFixtureResult.id}`
        : "窗口基准 · 点卡开练";
    const html = `<div class="feel-lab-head"><span>手感校准</span><em>${escapeHtml(recent)}</em></div>`
      + feelLabItems().map((fixture) => {
        const stats = feelFixtureStats(fixture);
        const status = drillContractStatus(stats);
        const progress = drillContractProgress(stats);
        const expected = Array.isArray(fixture.expected) ? fixture.expected.map(expertRequirementLabel).join("+") : "";
        const state = feelFixtureCardClass(fixture);
        return `<button class="feel-card ${escapeHtml(state)}" type="button" data-feel-fixture="${escapeHtml(fixture.id)}" style="--feel-progress: ${progress}%" aria-label="${escapeHtml(fixture.note)}">`
          + `<strong>${escapeHtml(expected || fixture.id)} · ${escapeHtml(feelFixtureStatusText(fixture, status))}</strong>`
          + `<em>${escapeHtml(feelFixtureLabel(fixture))} · ${escapeHtml(fixture.window)} ≤ ${Number(fixture.maxDelay).toFixed(3)}s</em>`
          + `<small>${escapeHtml(feelFixtureDetailText(fixture))}</small>`
          + `<i aria-hidden="true"></i>`
          + `</button>`;
      }).join("");
    if (html === lastFeelLabHtml) return;
    lastFeelLabHtml = html;
    feelLab.innerHTML = html;
  }

  function startFeelFixture(id) {
    const fixture = findFeelFixtureById(id);
    if (!fixture) {
      rejectTrainingEntry("手感校准");
      return false;
    }
    const index = Math.max(0, Math.min(maps.length - 1, Number(fixture.room) - 1));
    const mode = feelFixtureMode(fixture);
    startRoomDrill(index, mode, { feelFixture: fixture.id });
    focusPopupText = `手感校准 · ${fixture.id}`;
    focusPopupDetail = `${fixture.note} / ${fixture.window} ≤ ${Number(fixture.maxDelay).toFixed(3)}s`;
    focusPopupTimer = FOCUS_POPUP_TIME;
    setGameStatus(`手感校准 ${fixture.id}：${fixture.note}`);
    return true;
  }

  function updateDrillVariantButtons() {
    const target = practiceTargetRoom();
    if (drillCleanButton) {
      drillCleanButton.textContent = "无失误 · Clean";
      drillCleanButton.title = drillBriefText(target, "clean");
    }
    if (drillPaceButton) {
      drillPaceButton.textContent = "节奏 · Pace";
      drillPaceButton.title = drillBriefText(target, "pace");
    }
    if (drillStyleButton) {
      drillStyleButton.textContent = "类型 · Style";
      drillStyleButton.title = drillBriefText(target, "style");
      drillStyleButton.classList.add("style");
    }
    if (drillExpertButton) {
      drillExpertButton.textContent = "高手 · Expert";
      drillExpertButton.title = drillBriefText(target, "expert");
      drillExpertButton.classList.add("expert");
    }
  }

  function practiceQueueItems() {
    const cleanIndex = cleanPracticeRoom();
    const paceIndex = pacePracticeRoom();
    const styleIndex = stylePracticeRoom();
    const expertIndex = expertPracticeRoom();
    return [
      {
        mode: "clean",
        index: cleanIndex,
        label: "Clean",
        reason: "补无失误",
        detail: roomPracticeReason(cleanIndex),
        stats: drillContractStats(cleanIndex, "clean")
      },
      {
        mode: "pace",
        index: paceIndex,
        label: "Pace",
        reason: "追目标时间",
        detail: roomPracticeReason(paceIndex),
        stats: drillContractStats(paceIndex, "pace")
      },
      {
        mode: "style",
        index: styleIndex,
        label: "Style",
        reason: "练类型",
        detail: styleTrialLabel(styleIndex),
        stats: drillContractStats(styleIndex, "style")
      },
      {
        mode: "expert",
        index: expertIndex,
        label: "Expert",
        reason: "冲高手线",
        detail: roomPracticeReason(expertIndex),
        stats: drillContractStats(expertIndex, "expert")
      }
    ];
  }

  function drillContractStats(index, mode) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    return drillContractStatsData(entry, mode);
  }

  function drillContractStatus(stats) {
    if (stats.wins > 0) return `完成 ${stats.wins}/${stats.starts}`;
    if (stats.starts > 0) return `尝试 ${stats.wins}/${stats.starts}`;
    return "未开练";
  }

  function drillContractProgress(stats) {
    return drillContractProgressData(stats);
  }

  function contractModeShort(mode) {
    if (mode === "clean") return "C";
    if (mode === "pace") return "P";
    if (mode === "style") return "S";
    if (mode === "expert") return "X";
    return "?";
  }

  function contractModeLabel(mode) {
    return mode === "expert" ? "Expert" : drillModeLabel(mode);
  }

  function contractGapText(index, mode) {
    const stats = drillContractStats(index, mode);
    if (stats.wins > 0) return `${contractModeLabel(mode)} 已完成`;
    if (stats.starts > 0) return `${contractModeLabel(mode)} 重试 ${stats.wins}/${stats.starts}`;
    return `${contractModeLabel(mode)} 未开练`;
  }

  function nextMasteryStepText(index) {
    const mode = roomReviewMode(index);
    const stats = drillContractStats(index, mode);
    if (roomMasteryScore(index) >= 86 && stats.wins > 0) return "维护 PB / Flow";
    return `下一 ${contractModeLabel(mode)} Drill`;
  }

  function masteryContractPillsHtml(index, activeMode = roomReviewMode(index)) {
    const modes = ["clean", "pace", "style", "expert"];
    return `<span class="contract-pills" aria-hidden="true">` + modes.map((mode) => {
      const stats = drillContractStats(index, mode);
      const state = stats.wins > 0 ? "done" : mode === activeMode ? "active" : stats.starts > 0 ? "tried" : "todo";
      return `<i class="contract-pill ${state} ${escapeHtml(mode)}">${escapeHtml(contractModeShort(mode))}</i>`;
    }).join("") + `</span>`;
  }

  function cleanPracticeRoom() {
    const index = maps.findIndex((_, roomId) => {
      const entry = roomFocus[roomId] || createRoomFocusEntry();
      return entry.clean <= 0;
    });
    return index >= 0 ? index : recommendedPracticeRoom();
  }

  function pacePracticeRoom() {
    const loss = largestSplitLossRoom();
    if (loss && loss.loss > 0) return loss.index;
    const nonS = maps.findIndex((_, index) => splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]) !== "S");
    return nonS >= 0 ? nonS : recommendedPracticeRoom();
  }

  function expertPracticeRoom() {
    const ready = maps.findIndex((_, index) => {
      const entry = roomFocus[index] || createRoomFocusEntry();
      return splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]) === "S" && entry.clean > 0 && entry.styleWins > 0 && entry.expertWins <= 0;
    });
    if (ready >= 0) return ready;
    const cleanS = maps.findIndex((_, index) => splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]) === "S");
    return cleanS >= 0 ? cleanS : pacePracticeRoom();
  }

  function stylePracticeRoom() {
    const ready = maps.findIndex((_, index) => {
      const entry = roomFocus[index] || createRoomFocusEntry();
      return entry.clean > 0 && splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]) === "S" && entry.styleWins <= 0;
    });
    if (ready >= 0) return ready;
    const played = maps.findIndex((_, index) => {
      const entry = roomFocus[index] || createRoomFocusEntry();
      return (bestRoomTimes[index] > 0 || entry.clean > 0) && entry.styleWins <= 0;
    });
    return played >= 0 ? played : pacePracticeRoom();
  }

  function updatePracticeQueue() {
    if (!practiceQueue || !settingsVisible) return;
    const html = practiceQueueItems().map((item) => {
      const title = `R${item.index + 1} ${ROOM_NAMES[item.index] || "Summit"}`;
      const objective = drillObjectiveForRoom(item.index, item.mode);
      const progress = drillContractProgress(item.stats);
      const status = drillContractStatus(item.stats);
      return `<button class="queue-card ${item.mode}" type="button" data-queue-room="${item.index}" data-queue-mode="${item.mode}" aria-label="${escapeHtml(item.label)} ${escapeHtml(title)} ${escapeHtml(objective)}">`
        + `<span class="queue-meta"><b>${escapeHtml(item.label)}</b><i>${escapeHtml(status)}</i></span>`
        + `<strong>${escapeHtml(title)}</strong>`
        + `<em>${escapeHtml(item.reason)} · ${escapeHtml(item.detail)}</em>`
        + `<i class="queue-meter" style="--queue-progress: ${progress}%" aria-hidden="true"></i>`
        + `<small>${escapeHtml(objective)}</small>`
        + `<span class="queue-cta" aria-hidden="true">开练</span>`
        + `</button>`;
    }).join("");
    if (html === lastPracticeQueueHtml) return;
    lastPracticeQueueHtml = html;
    practiceQueue.innerHTML = html;
  }

  function challengeById(id) {
    return LONG_TERM_CHALLENGES.find((challenge) => challenge.id === id) || LONG_TERM_CHALLENGES[0];
  }

  function challengeStartsRun(challenge) {
    return Boolean(challenge && (challenge.kind === "run" || challenge.kind === "nodeath" || challenge.kind === "flow"));
  }

  function createActiveChallenge(id = "clear") {
    const challenge = challengeById(id);
    return createActiveChallengeData(challenge, Math.max(bestFlow, profile.bestFlowPeak || 0));
  }

  function activeChallengeState() {
    if (!activeChallenge) return null;
    const challenge = challengeById(activeChallenge.id);
    return activeChallengeStateData(activeChallenge, challenge, {
      won,
      roomIndex,
      roomTotal: maps.length,
      deathCount,
      flowPeak,
      flowTarget: FLOW_CHALLENGE_TARGET,
      bestFlow: Math.max(bestFlow, profile.bestFlowPeak || 0)
    });
  }

  function activeChallengeReview() {
    return activeChallengeReviewData(activeChallengeState());
  }

  function challengeTargetRoom(challenge) {
    if (challenge.kind === "clean" || challenge.kind === "nodeath") return cleanPracticeRoom();
    if (challenge.kind === "pace" || challenge.kind === "flow") return pacePracticeRoom();
    if (challenge.kind === "style") return stylePracticeRoom();
    if (challenge.kind === "expert") return expertPracticeRoom();
    return recommendedPracticeRoom();
  }

  function challengeProgress(challenge) {
    const progress = challengeProgressData(challenge, {
      roomTotal: maps.length,
      summitClears: profile.summitClears,
      bestTime,
      cleanRooms: cleanRoomCount(),
      sRooms: sRankRoomCount(),
      styleRooms: styleWinRoomCount(),
      expertRooms: expertWinRoomCount(),
      bestDeathCount: profile.bestDeathCount,
      bestFlow: Math.max(bestFlow, profile.bestFlowPeak || 0),
      flowTarget: FLOW_CHALLENGE_TARGET
    });
    return {
      ...progress,
      index: challengeTargetRoom(challenge),
      mode: challenge.mode || "auto"
    };
  }

  function challengeBoardItems() {
    return LONG_TERM_CHALLENGES.map((challenge) => ({
      ...challenge,
      ...challengeProgress(challenge)
    }));
  }

  function syncChallengeWins({ persist = true } = {}) {
    const reconciled = reconcileChallengeWinsData(
      profile.challengeWins,
      challengeBoardItems(),
      LONG_TERM_CHALLENGES.map((challenge) => challenge.id)
    );
    if (!reconciled.changed) return false;
    profile.challengeWins = reconciled.challengeWins;
    if (persist) writeProfile();
    return true;
  }

  function updateChallengeBoard() {
    if (!challengeBoard || !settingsVisible) return;
    const items = challengeBoardItems();
    const html = `<div class="challenge-head"><span>长期挑战</span><em>每张卡都是入口</em></div>`
      + items.map((item) => {
        const fullRun = challengeStartsRun(item);
        const title = fullRun ? "完整路线" : `R${item.index + 1} ${drillModeLabel(item.mode)}`;
        const attrs = fullRun
          ? `data-challenge-run="${escapeHtml(item.id)}"`
          : `data-challenge-room="${item.index}" data-challenge-mode="${escapeHtml(item.mode)}"`;
        return `<button class="challenge-card ${item.done ? "done" : "todo"} ${escapeHtml(item.kind)}" type="button" ${attrs} style="--challenge-progress: ${item.progress}%" aria-label="${escapeHtml(item.label)} ${escapeHtml(item.detail)}">`
          + `<span class="challenge-meta"><b>${escapeHtml(item.label)}</b><i>${item.done ? "完成" : `${item.progress}%`}</i></span>`
          + `<strong>${escapeHtml(item.detail)}</strong>`
          + `<em>${escapeHtml(item.goal)}</em>`
          + `<small>${escapeHtml(item.done ? "继续维护 PB / Flow" : title)}</small>`
          + `<u aria-hidden="true"></u>`
          + `</button>`;
      }).join("");
    if (html === lastChallengeBoardHtml) return;
    lastChallengeBoardHtml = html;
    challengeBoard.innerHTML = html;
  }

  function updateProfileSummary() {
    if (!profileSummary || !settingsVisible) return;
    const data = chapterCompletionData();
    const challengeWins = challengeBoardItems().filter((item) => item.done).length;
    const bestDeath = profile.bestDeathCount === null ? "未记录" : `失 ${profile.bestDeathCount}`;
    const html = `<div class="profile-head"><span>长期档案</span><strong>${escapeHtml(chapterGrade(data.percent))} · ${data.percent}%</strong></div>`
      + `<div class="profile-grid">`
      + `<span><b>${profile.summitClears}</b><em>登顶</em></span>`
      + `<span><b>${escapeHtml(bestDeath)}</b><em>最佳失误</em></span>`
      + `<span><b>${Math.floor(Math.max(bestFlow, profile.bestFlowPeak || 0))}</b><em>Flow</em></span>`
      + `<span><b>${contractWinCount()}</b><em>合约完成</em></span>`
      + `<span><b>${challengeWins}/${LONG_TERM_CHALLENGES.length}</b><em>挑战</em></span>`
      + `<span><b>${profile.bestRelayChain}</b><em>Relay</em></span>`
      + `</div>`
      + `${storageHealthMessage ? `<small class="storage-note">${escapeHtml(storageHealthMessage)}</small>` : ""}`;
    if (html === lastProfileSummaryHtml) return;
    lastProfileSummaryHtml = html;
    profileSummary.innerHTML = html;
  }

  function roomMasteryScore(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    const best = bestRoomTimes[index] || 0;
    const target = ROOM_TARGETS[index] || 0;
    const grade = splitGrade(best, target);
    return roomMasteryScoreData({
      entry,
      best,
      grade,
      focusScore: roomFocusScore(index)
    });
  }

  function roomMasteryLevel(score) {
    return roomMasteryLevelData(score);
  }

  function roomReviewMode(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    const loss = roomSplitLoss(index);
    const pressure = roomFocusScore(index);
    const grade = splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]);
    return roomReviewModeData({ entry, loss, pressure, grade });
  }

  function roomReviewPriority(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    const loss = roomSplitLoss(index);
    return roomReviewPriorityData({
      roomCount: maps.length,
      index,
      entry,
      best: bestRoomTimes[index],
      loss,
      pressure: roomFocusScore(index)
    });
  }

  function practiceLedgerRows() {
    return rankPracticeLedgerRowsData(maps.map((_, index) => {
      const mode = roomReviewMode(index);
      const score = roomMasteryScore(index);
      return {
        index,
        mode,
        score,
        priority: roomReviewPriority(index),
        action: `${drillModeLabel(mode)} Drill`,
        level: roomMasteryLevel(score)
      };
    }));
  }

  function masteryRoadmapRows(limit = 4) {
    return practiceLedgerRows().slice(0, limit).map((row) => ({
      ...row,
      title: `R${row.index + 1} ${ROOM_NAMES[row.index] || "Summit"}`,
      objective: drillObjectiveForRoom(row.index, row.mode),
      gap: contractGapText(row.index, row.mode),
      next: nextMasteryStepText(row.index)
    }));
  }

  function masteryRoadmapSummary() {
    return masteryRoadmapRows(3)
      .map((row) => `R${row.index + 1} ${contractModeShort(row.mode)}`)
      .join(" → ");
  }

  function practiceLedgerSummary() {
    return practiceLedgerRows()
      .slice(0, 3)
      .map((row) => `R${row.index + 1} ${drillModeLabel(row.mode)}`)
      .join(" · ");
  }

  function updatePracticeLedger() {
    if (!practiceLedger || !settingsVisible) return;
    const rows = practiceLedgerRows();
    const html = `<div class="ledger-head"><span>房间掌握表</span><em>按优先级排序 · 点一行开练</em></div>`
      + rows.map((row, rank) => {
        const entry = roomFocus[row.index] || createRoomFocusEntry();
        const title = `R${row.index + 1} ${ROOM_NAMES[row.index] || "Summit"}`;
        const reason = `${roomPracticeReason(row.index)} · ${routePracticeLine(row.index)}`;
        const contract = roomDrillContractText(row.index);
        const stats = `${roomMedalLabel(row.index)} / ${roomPaceLabel(row.index)} / ${roomCleanText(row.index)}`;
        const className = row.score >= 66 ? "strong" : row.score >= 30 ? "warming" : "weak";
        const focus = roomFocusScore(row.index) > 0 ? ` · 重点 ${deathReasonLabel(leadingRoomReason(entry))}` : "";
        return `<button class="ledger-row ${className}" type="button" data-ledger-room="${row.index}" data-ledger-mode="${row.mode}" title="${escapeHtml(row.action)}">`
          + `<span class="ledger-rank">#${rank + 1}</span>`
          + `<span class="ledger-main"><strong>${escapeHtml(title)}</strong><em>${escapeHtml(reason)}</em></span>`
          + `<span class="ledger-stats"><strong>${escapeHtml(row.level)} ${row.score}</strong><em>${escapeHtml(stats)}${escapeHtml(focus)}</em>${masteryContractPillsHtml(row.index, row.mode)}<small>${escapeHtml(contract)}</small></span>`
          + `<span class="ledger-meter" style="--ledger-score: ${row.score}%" aria-hidden="true"></span>`
          + `<span class="ledger-action">${escapeHtml(row.action)}</span>`
          + `</button>`;
      }).join("");
    if (html === lastPracticeLedgerHtml) return;
    lastPracticeLedgerHtml = html;
    practiceLedger.innerHTML = html;
  }

  function resetFocusStats() {
    roomMistakes = createRoomCounters();
    roomFocus = normalizeRoomFocus([]);
    roomAttemptClean = true;
    clearFocusResetConfirm();
    clearFocusPopup();
    writeRoomFocus();
    refreshRoomSelectOptions();
    updatePracticeCoach();
  }

  function getInput() {
    const left = keyHeldAny(actionCodes("left")) || touch.left || gamepadInput.left;
    const right = keyHeldAny(actionCodes("right")) || touch.right || gamepadInput.right;
    const up = keyHeldAny(actionCodes("up")) || touch.up || gamepadInput.up;
    const down = keyHeldAny(actionCodes("down")) || touch.down || gamepadInput.down;
    const grab = settings.grabMode === "toggle" ? grabLatched : rawGrabHeld();
    return resolveMovementInput({ left, right, up, down, grab });
  }

  function rawGrabHeld() {
    return keyHeldAny(actionCodes("grab")) || touch.grab || gamepadInput.grab;
  }

  function clearGrabToggle() {
    grabLatched = false;
    lastGrabHeld = false;
  }

  function updateGrabModeState() {
    const held = rawGrabHeld();
    if (settings.grabMode !== "toggle") {
      if (grabLatched) grabLatched = false;
      lastGrabHeld = held;
      return;
    }
    if (!started || won || player.deadTimer > 0) {
      clearGrabToggle();
      return;
    }
    if (held && !lastGrabHeld) {
      grabLatched = !grabLatched;
      actionPulse.grab = ACTION_PULSE_TIME;
      setGameStatus(grabLatched ? "抓墙切换：已保持" : "抓墙切换：已松开");
    }
    lastGrabHeld = held;
  }

  function hasTimingIntent(input) {
    return input.x !== 0 || input.y !== 0 || input.grab || player.jumpBuffer > 0 || player.dashBuffer > 0;
  }

  function justPressedAny(codes) {
    return inputPressedAny(pressed, codes);
  }

  function keyHeldAny(codes) {
    return inputHeldAny(keys, codes);
  }

  function queueAction(code) {
    if (isActionCode(code, "jump")) {
      setInputBuffer(player, "jump", JUMP_BUFFER_TIME);
      actionPulse.jump = ACTION_PULSE_TIME;
    }
    if (isActionCode(code, "dash")) {
      setInputBuffer(player, "dash", DASH_BUFFER_TIME);
      actionPulse.dash = ACTION_PULSE_TIME;
    }
    if (isActionCode(code, "grab")) {
      actionPulse.grab = ACTION_PULSE_TIME;
    }
  }

  function updateGamepad() {
    const supported = typeof navigator !== "undefined" && typeof navigator.getGamepads === "function";
    const pads = supported ? navigator.getGamepads() : [];
    const resolved = resolveGamepadState(pads, {
      supported,
      deadzone: settings.gamepadDeadzone
    });
    Object.assign(gamepadInput, resolved.input);
    lastGamepadStatus = resolved.status;
    updateGamepadStatusOutput();

    syncInputHeld(gamepadHeld, gamepadPressed, resolved.heldActions).forEach((action) => {
      if (actionPulse[action] !== undefined) actionPulse[action] = ACTION_PULSE_TIME;
    });
  }

  function updateGamepadStatusOutput() {
    if (!gamepadStatusOutput) return;
    const text = gamepadStatusLabel();
    if (text === lastGamepadStatusText) return;
    lastGamepadStatusText = text;
    gamepadStatusOutput.textContent = text;
  }

  function gamepadStatusLabel() {
    if (!lastGamepadStatus.supported) return "不支持";
    if (!lastGamepadStatus.connected) return "未连接";
    const active = lastGamepadStatus.activeActions.length ? ` · ${lastGamepadStatus.activeActions.slice(0, 2).join("/")}` : "";
    const axis = lastGamepadStatus.axisMagnitude > 0.05 ? ` · 轴 ${lastGamepadStatus.axisMagnitude.toFixed(2)}` : "";
    const drift = lastGamepadStatus.driftRisk ? " · 接近死区" : "";
    return `${lastGamepadStatus.count} 个 · standard ${lastGamepadStatus.standardMapping}${axis}${drift}${active}`;
  }

  function recallToAnchor() {
    if (!echoAnchor || echoAnchor.room !== roomIndex || recallCooldown > 0 || player.deadTimer > 0) return;
    markRoomTech("recall");
    player.x = echoAnchor.x;
    player.y = echoAnchor.y;
    player.vx = 0;
    player.vy = 0;
    restoreDashCharge();
    player.stamina = MAX_STAMINA;
    player.dashTimer = 0;
    player.dashCooldown = 0;
    player.sparkHopTimer = 0;
    player.wallJumpLock = 0;
    player.wallCoyote = 0;
    player.wallCoyoteDir = 0;
    player.overdrive = 0;
    recallCooldown = ECHO_RECALL_COOLDOWN;
    recallPulseTimer = 0.42;
    triggerActionVisual("recall", 0.34);
    showFeelCue("回声召回", "冲刺与体力已恢复", palette.green, FEEL_CUE_TIME * 1.05);
    playSound("recall");
    setGameStatus("回声召回：冲刺与体力已恢复");
    hitStopTimer = Math.max(hitStopTimer, 0.012);
    resetRelayChain();
    clearRecentPath();
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.green, 20, 260);
  }

  function actionCodes(action) {
    const code = effectiveBindings()[action];
    return code ? [code] : [];
  }

  function isActionCode(code, action) {
    return actionCodes(action).includes(code);
  }

  function shouldBlockKey(code) {
    return shouldBlockKeyData(code, {
      blockedCodes: BLOCKED_CODES,
      controlsPreset: settings.controlsPreset,
      bindingActions: BINDING_ACTIONS,
      customBindings: settings.customBindings
    });
  }

  function isStartCode(code) {
    return isStartCodeData(code, effectiveBindings());
  }

  function defaultBindingsForLayout(layout) {
    return defaultBindingsForLayoutData(layout, KEYBOARD_LAYOUT_DEFAULTS);
  }

  function effectiveBindings() {
    return effectiveBindingsData(settings, CONTROL_PRESETS);
  }

  function validBindingCode(code) {
    return validBindingCodeData(code, RESERVED_BINDING_CODES);
  }

  function keyCodeLabel(code, layout = settings.keyboardLayout) {
    return keyCodeLabelData(code, layout);
  }

  function beginKeyBindingCapture(action) {
    if (!BINDING_ACTIONS.includes(action)) return;
    if (!pendingBindingAction) {
      bindingCaptureSnapshot = {
        controlsPreset: settings.controlsPreset,
        customBindings: { ...settings.customBindings }
      };
    }
    if (settings.controlsPreset !== "custom") {
      settings.customBindings = { ...effectiveBindings() };
    }
    pendingBindingAction = action;
    settings.controlsPreset = "custom";
    syncKeyBindingEditor();
    if (keyBindingStatus) keyBindingStatus.textContent = `请按下“${BINDING_LABELS[action]}”的新按键；Esc 取消`;
  }

  function cancelKeyBindingCapture({ announce = true } = {}) {
    if (!pendingBindingAction && !bindingCaptureSnapshot) return;
    if (bindingCaptureSnapshot) {
      settings.controlsPreset = bindingCaptureSnapshot.controlsPreset;
      settings.customBindings = { ...bindingCaptureSnapshot.customBindings };
    }
    pendingBindingAction = "";
    bindingCaptureSnapshot = null;
    syncKeyBindingEditor();
    if (announce && keyBindingStatus) keyBindingStatus.textContent = "已取消改键，原方案保持不变";
  }

  function captureKeyBinding(code) {
    const action = pendingBindingAction;
    if (!action) return;
    if (code === "Escape") {
      cancelKeyBindingCapture();
      return;
    }
    if (!validBindingCode(code)) {
      if (keyBindingStatus) keyBindingStatus.textContent = "该按键保留给界面操作，请选择其他按键";
      return;
    }
    const rebound = rebindActionData(settings.customBindings, BINDING_ACTIONS, action, code);
    settings.customBindings = rebound.bindings;
    settings.controlsPreset = "custom";
    pendingBindingAction = "";
    bindingCaptureSnapshot = null;
    releaseAllInputs();
    syncKeyBindingEditor();
    writeSettings();
    const swapped = rebound.occupiedAction ? `，已与“${BINDING_LABELS[rebound.occupiedAction]}”交换` : "";
    if (keyBindingStatus) keyBindingStatus.textContent = `${BINDING_LABELS[action]}：${keyCodeLabel(code)}${swapped}`;
    setGameStatus(`键位已更新：${BINDING_LABELS[action]} ${keyCodeLabel(code)}`);
  }

  function syncKeyBindingEditor() {
    if (keyboardLayoutSelect) keyboardLayoutSelect.value = settings.keyboardLayout;
    if (controlPresetSelect) controlPresetSelect.value = settings.controlsPreset;
    if (grabModeSelect) grabModeSelect.value = settings.grabMode;
    document.querySelectorAll("[data-layout-choice]").forEach((button) => {
      const active = button.dataset.layoutChoice === settings.keyboardLayout;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-preset-choice]").forEach((button) => {
      const active = button.dataset.presetChoice === settings.controlsPreset;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-grab-choice]").forEach((button) => {
      const active = button.dataset.grabChoice === settings.grabMode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-layout-choice], [data-preset-choice], [data-grab-choice]").forEach((button) => {
      button.toggleAttribute("disabled", Boolean(pendingBindingAction));
    });
    const visibleBindings = effectiveBindings();
    if (controlProfileNote) {
      const title = controlProfileNote.querySelector("strong");
      const detail = controlProfileNote.querySelector("span");
      const isMac = settings.keyboardLayout === "mac";
      if (settings.controlsPreset === "classic") {
        if (title) title.textContent = "经典 · 蔚蓝键位";
        if (detail) detail.textContent = "方向键移动，C 跳跃，X 冲刺，Z 抓墙；左右手职责清晰。";
      } else if (settings.controlsPreset === "comfort") {
        if (title) title.textContent = "舒适 · 双手分区";
        if (detail) detail.textContent = isMac
          ? "WASD 移动，Space 跳跃，J / K 操作；避开 ⌘ 与 ⌥ 系统快捷键。"
          : "WASD 移动，Space 跳跃，J / K 分担抓墙与冲刺。";
      } else {
        if (title) title.textContent = "自定义 · 点击改键";
        if (detail) detail.textContent = isMac
          ? "点击任一键位后直接按新键；会显示 ⌘、⌥、⌃ 等 Mac 标识。"
          : "点击任一键位后直接按新键；重复按键会自动交换。";
      }
    }
    keyBindingEditor?.querySelectorAll("[data-binding-action]").forEach((button) => {
      const action = button.dataset.bindingAction || "";
      const code = visibleBindings?.[action] || "";
      const key = button.querySelector("kbd");
      if (key) key.textContent = pendingBindingAction === action ? "按键…" : keyCodeLabel(code);
      button.classList.toggle("capturing", pendingBindingAction === action);
      button.setAttribute("aria-pressed", String(pendingBindingAction === action));
      button.setAttribute("aria-label", `${BINDING_LABELS[action] || action}，当前 ${keyCodeLabel(code)}，点击后重新绑定`);
    });
    resetKeyBindingsButton?.toggleAttribute("disabled", Boolean(pendingBindingAction));
    if (!pendingBindingAction && keyBindingStatus && !keyBindingStatus.textContent.trim()) {
      keyBindingStatus.textContent = "点击键位后按下新按键";
    }
  }

  function updateInputCues(input) {
    if (input.grab && player.wallDir !== 0 && !player.wasGrounded) {
      actionPulse.grab = Math.max(actionPulse.grab, 0.08);
    }
    if (!player.wasGrounded && Math.abs(player.vy) < APEX_WINDOW_SPEED && jumpHeld()) {
      actionPulse.apex = Math.max(actionPulse.apex, 0.08);
    }
    if (input.y > 0 && player.vy > 120) {
      actionPulse.fall = Math.max(actionPulse.fall, 0.09);
    }
    if (player.wallCoyote > 0 && player.wallDir === 0) {
      actionPulse.wall = Math.max(actionPulse.wall, 0.07);
    }
  }

  function resetActionPulses() {
    for (const key of Object.keys(actionPulse)) {
      actionPulse[key] = 0;
    }
  }

  function triggerActionVisual(name, duration) {
    if (actionVisual[name] === undefined) return;
    actionVisual[name] = Math.max(actionVisual[name], duration);
  }

  function triggerSparkVariantVisual(variant) {
    triggerActionVisual("spark", variant === "spark" ? 0.28 : 0.38);
    if (variant === "wallSpark") triggerActionVisual("wall", 0.34);
    if (variant === "prismSpark") triggerActionVisual("prism", 0.48);
  }

  function updateActionVisuals(dt) {
    for (const key of Object.keys(actionVisual)) {
      actionVisual[key] = Math.max(0, actionVisual[key] - dt);
    }
  }

  function resetActionVisuals() {
    for (const key of Object.keys(actionVisual)) {
      actionVisual[key] = 0;
    }
    clearFeelCue();
  }

  function visualRatio(name, duration) {
    return Math.max(0, Math.min(1, actionVisual[name] / duration));
  }

  function performanceShadowBlur(value) {
    return settings.lowPerformance ? 0 : value;
  }

  function showFeelCue(text, detail = "", color = palette.cyan, duration = FEEL_CUE_TIME) {
    feelCueText = text;
    feelCueDetail = detail;
    feelCueColor = color;
    feelCueMax = duration;
    feelCueTimer = duration;
  }

  function showMechanicFirstTouchCue(key) {
    if (mechanicFirstTouchSeen[key]) return false;
    const cue = mechanicFirstTouchCueData(key, {
      seen: mechanicFirstTouchSeen,
      roomFocus,
      bestRoomTimes
    });
    mechanicFirstTouchSeen[key] = true;
    if (!cue) return false;
    const color = key === "prism" ? palette.gold : key === "crumble" ? palette.hot : palette.cyan;
    showFeelCue(cue.title, cue.detail, color, FEEL_CUE_TIME * 1.65);
    setGameStatus(`${cue.title}：${cue.detail}`);
    return true;
  }

  function clearFeelCue() {
    feelCueTimer = 0;
    feelCueText = "";
    feelCueDetail = "";
    feelCueColor = palette.cyan;
    feelCueMax = FEEL_CUE_TIME;
  }

  function roomSelectLabel(index) {
    return `R${index + 1} · ${ROOM_NAMES[index] || "Summit"}${roomSelectFocusLabel(index).replace(" / ", " · ")}`;
  }

  function refreshRoomSelectOptions() {
    if (!roomSelect) return;
    for (const option of roomSelect.options) {
      const index = Number(option.value);
      option.textContent = roomSelectLabel(index);
      option.title = roomFocusDetails(index);
    }
    updateRoomBrief();
  }

  function populateRoomSelect() {
    if (!roomSelect) return;
    roomSelect.innerHTML = "";
    maps.forEach((_, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = roomSelectLabel(index);
      option.title = roomFocusDetails(index);
      roomSelect.appendChild(option);
    });
    updateRoomBrief();
  }

  function syncRoomSelect() {
    if (!roomSelect || document.activeElement === roomSelect) return;
    if (settingsVisible && panelMode === "practice") return;
    roomSelect.value = String(roomIndex);
    updateRoomBrief();
  }

  function roomBriefHtml(index) {
    const route = (tone, label, slot) => `<span class="room-route ${tone}"><b>${label}</b><em>${escapeHtml(routeLineCore(index, slot))}</em></span>`;
    return `<span class="room-brief-head"><strong>R${index + 1} ${escapeHtml(ROOM_NAMES[index] || "Summit")}</strong><em>${escapeHtml(roomMedalLabel(index))} · ${escapeHtml(roomPaceLabel(index))}</em></span>`
      + `<span class="room-brief-stats">${escapeHtml(roomCleanText(index))} · ${escapeHtml(roomDrillText(index))} · ${escapeHtml(roomSkillLabel(index))}<small>合同 ${escapeHtml(roomDrillContractText(index))}</small></span>`
      + `<span class="room-brief-focus"><b>本房目标</b><em>${escapeHtml(roomPurposeLabel(index))}</em><small>${escapeHtml(styleTrialText(index))}</small></span>`
      + `<span class="room-route-grid">${route("safe", "稳健", 0)}${route("fast", "快速", 1)}${route("expert", "高手", 2)}</span>`;
  }

  function updateRoomBrief() {
    if (!roomBrief || !roomSelect) return;
    const index = Number(roomSelect.value);
    const target = Number.isInteger(index) && index >= 0 && index < maps.length ? index : roomIndex;
    roomBrief.innerHTML = roomBriefHtml(target);
    updateDrillVariantButtons();
  }

  function storagePresence(key) {
    try {
      return localStorage.getItem(key) === null ? "empty" : "present";
    } catch {
      return "blocked";
    }
  }

  function activeRouteDiagnostics() {
    const data = activeRouteContractData();
    if (!data) return null;
    return {
      id: data.contract.id,
      label: data.contract.label,
      step: data.stepIndex + 1,
      total: data.total,
      room: data.step.index + 1,
      mode: data.step.mode
    };
  }

  function lastRouteDiagnostics() {
    if (!lastRouteContractResult) return null;
    return {
      id: lastRouteContractResult.id,
      done: Boolean(lastRouteContractResult.done),
      step: Number.isInteger(lastRouteContractResult.step) ? lastRouteContractResult.step + 1 : null,
      detail: lastRouteContractResult.detail || ""
    };
  }

  function buildDiagnosticsSnapshot() {
    const challenge = activeChallengeState();
    const chapter = chapterCompletionData();
    const routes = ROUTE_CONTRACTS.map((contract) => ({
      id: contract.id,
      progress: routeContractProgress(contract)
    }));
    const challengeWins = Object.keys(profile.challengeWins || {}).filter((key) => profile.challengeWins[key]).length;
    const snapshot = {
      schemaVersion: 1,
      build: document.querySelector('meta[name="build-version"]')?.content || "dev",
      capturedAt: new Date().toISOString(),
      privacy: "No user identity, user agent, raw input history, replay path, or secrets.",
      feedback: feedbackDiagnostics(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
        coarsePointer: window.matchMedia?.("(pointer: coarse)")?.matches || false,
        touchPoints: navigator.maxTouchPoints || 0
      },
      settings: {
        schemaVersion: settings.schemaVersion,
        controlsPreset: settings.controlsPreset,
        grabMode: settings.grabMode,
        gamepadDeadzone: settings.gamepadDeadzone,
        touchSize: settings.touchSize,
        lowPerformance: settings.lowPerformance,
        calmEffects: settings.calmEffects,
        practiceLines: settings.practiceLines,
        assistMode: settings.assistMode,
        audioEnabled: settings.audioEnabled,
        audioVolume: settings.audioVolume
      },
      storage: {
        settings: storagePresence(SETTINGS_KEY),
        profile: storagePresence(PROFILE_KEY),
        roomFocus: storagePresence(ROOM_FOCUS_KEY),
        roomBests: storagePresence(ROOM_BESTS_KEY),
        roomPaths: storagePresence(ROOM_PATHS_KEY)
      },
      gamepad: gamepadDiagnostics(),
      run: {
        started,
        won,
        room: roomIndex + 1,
        chapter: chapterIndexForRoom(roomIndex) + 1,
        chapterTransition: chapterTransitionTimer > 0,
        summitReveal: summitRevealTimer > 0,
        deaths: deathCount,
        runTime: Math.round(runTime * 100) / 100,
        roomTime: Math.round(roomTime * 100) / 100,
        roomTimes: runRoomTimes.map((seconds) => Math.round(seconds * 100) / 100),
        roomMistakes: roomMistakes.slice(),
        chapterSplits: runChapterSplits().map((chapter) => ({
          chapter: chapter.index + 1,
          seconds: Math.round(chapter.seconds * 100) / 100,
          mistakes: chapter.mistakes,
          visited: chapter.visited,
          rooms: chapter.rooms
        })),
        flowPeak: Math.floor(flowPeak),
        recordsEligible: recordsEligible(),
        activeDrill: activeDrill ? { room: activeDrill.room + 1, mode: activeDrill.mode } : null,
        activeChallenge: challenge ? { id: challenge.id, status: challenge.status, progress: challenge.progress } : null,
        activeRoute: activeRouteDiagnostics(),
        activeFeel: activeFeelFixture ? { id: activeFeelFixture.id, room: activeFeelFixture.room + 1, mode: activeFeelFixture.mode } : null,
        lastRoute: lastRouteDiagnostics(),
        lastFeel: lastFeelFixtureResult ? { id: lastFeelFixtureResult.id, done: Boolean(lastFeelFixtureResult.done), detail: lastFeelFixtureResult.detail || "" } : null
      },
      progress: {
        chapterPercent: chapter.percent,
        clearedRooms: chapter.clear,
        cleanRooms: chapter.clean,
        sRooms: chapter.pace,
        styleRooms: chapter.style,
        expertRooms: chapter.expert,
        contractWins: contractWinCount(),
        challengeWins,
        summitClears: profile.summitClears || 0,
        bestDeathCount: profile.bestDeathCount,
        bestFlow: Math.floor(Math.max(bestFlow, profile.bestFlowPeak || 0)),
        routeContracts: routes
      }
    };
    window.__summitLastDiagnostics = snapshot;
    return snapshot;
  }

  function feedbackDiagnostics() {
    const allowed = new Set(["route", "feel", "mobile", "audio", "storage", "other"]);
    const type = allowed.has(feedbackTypeSelect?.value) ? feedbackTypeSelect.value : "route";
    const raw = typeof feedbackNoteInput?.value === "string" ? feedbackNoteInput.value : "";
    const note = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
    return { type, note, noteLength: note.length };
  }

  function gamepadDiagnostics() {
    return {
      supported: lastGamepadStatus.supported,
      connected: lastGamepadStatus.connected,
      count: lastGamepadStatus.count,
      standardMapping: lastGamepadStatus.standardMapping,
      deadzone: settings.gamepadDeadzone,
      axisX: lastGamepadStatus.axisX,
      axisY: lastGamepadStatus.axisY,
      axisMagnitude: lastGamepadStatus.axisMagnitude,
      driftRisk: lastGamepadStatus.driftRisk,
      activeActions: lastGamepadStatus.activeActions.slice(0, 4)
    };
  }

  function buildFeedbackTemplate(snapshot = buildDiagnosticsSnapshot()) {
    const feedback = snapshot.feedback || { type: "route", note: "" };
    const active = snapshot.run?.activeDrill ? `R${snapshot.run.activeDrill.room} ${drillModeLabel(snapshot.run.activeDrill.mode)}` : "自由游玩";
    const route = snapshot.run?.activeRoute ? `${snapshot.run.activeRoute.label} ${snapshot.run.activeRoute.step}/${snapshot.run.activeRoute.total}` : "无";
    const feel = snapshot.run?.activeFeel ? `${snapshot.run.activeFeel.id} R${snapshot.run.activeFeel.room}` : "无";
    return [
      `Summit Spark ${snapshot.build}`,
      `反馈类型：${feedbackTypeLabel(feedback.type)}`,
      `备注：${feedback.note || "未填写"}`,
      `当前位置：R${snapshot.run?.room || 1} / ${active}`,
      `航线：${route}`,
      `Feel Lab：${feel}`,
      `视口：${snapshot.viewport.width}x${snapshot.viewport.height} dpr ${snapshot.viewport.dpr} coarse ${snapshot.viewport.coarsePointer ? "yes" : "no"}`,
      `手柄：${snapshot.gamepad.connected ? `${snapshot.gamepad.count} 个 / standard ${snapshot.gamepad.standardMapping}` : "未连接"} / dz ${snapshot.gamepad.deadzone.toFixed(2)}`,
      `进度：${snapshot.progress.clearedRooms}/${maps.length} clear / 合同 ${snapshot.progress.contractWins}`,
      "复现步骤：",
      "实际结果：",
      "期望结果："
    ].join("\n");
  }

  function feedbackTypeLabel(type) {
    const labels = {
      route: "路线摩擦",
      feel: "输入手感",
      mobile: "移动端",
      audio: "音频",
      storage: "存档",
      other: "其他"
    };
    return labels[type] || labels.route;
  }

  function downloadTextFile(text, filename, type = "text/plain") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function copyTextWithDownloadFallback(text, filename, type = "text/plain") {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) downloadTextFile(text, filename, type);
    return copied;
  }

  async function copyDiagnosticsSnapshot() {
    const snapshot = buildDiagnosticsSnapshot();
    const text = JSON.stringify(snapshot, null, 2);
    const filename = `summit-spark-diagnostics-${snapshot.build || "dev"}.json`;
    const copied = await copyTextWithDownloadFallback(text, filename, "application/json");
    const verb = copied ? "已复制" : "已下载";
    setGameStatus(`诊断${verb}，可贴到反馈`);
    playSound("ui", 0.72);
  }

  async function copyFeedbackTemplate() {
    const snapshot = buildDiagnosticsSnapshot();
    const text = buildFeedbackTemplate(snapshot);
    window.__summitLastFeedbackTemplate = text;
    const copied = await copyTextWithDownloadFallback(text, `summit-spark-feedback-${snapshot.build || "dev"}.txt`);
    const verb = copied ? "已复制" : "已下载";
    setGameStatus(`反馈模板${verb}`);
    playSound("ui", 0.68);
  }

  function buildSaveArchive() {
    const archive = createSaveArchiveData({
      kind: SAVE_ARCHIVE_KIND,
      schemaVersion: SAVE_ARCHIVE_SCHEMA_VERSION,
      build: document.querySelector('meta[name="build-version"]')?.content || "dev",
      exportedAt: new Date().toISOString(),
      settings,
      profile,
      roomBests: bestRoomTimes,
      roomPaths: bestRoomPaths,
      roomFocusSchemaVersion: ROOM_FOCUS_SCHEMA_VERSION,
      roomFocus,
      bestTime: readBestTime(),
      bestFlow: readBestFlow()
    });
    window.__summitLastSaveArchive = archive;
    return archive;
  }

  function readSessionValue(key) {
    try {
      return sessionStorage.getItem(key) || "";
    } catch {
      return "";
    }
  }

  function writeSessionValue(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Session storage is an optional refresh aid, never an auth result.
    }
  }

  function removeSessionValue(key) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Session storage is an optional refresh aid, never an auth result.
    }
  }

  function readAccountHint() {
    try {
      return localStorage.getItem(ACCOUNT_HINT_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function writeAccountHint(active) {
    try {
      if (active) localStorage.setItem(ACCOUNT_HINT_STORAGE_KEY, "1");
      else localStorage.removeItem(ACCOUNT_HINT_STORAGE_KEY);
    } catch {
      // The hint is optional and contains no account or session data.
    }
  }

  function initEntryMode() {
    const saved = readSessionValue(ENTRY_MODE_SESSION_KEY);
    if (saved === "guest") {
      resolveEntryMode("guest", false);
      return;
    }
    if (saved === "account" || readAccountHint()) {
      entryMode = "account";
      overlay?.classList.add("entry-checking");
      entryGate?.classList.add("hidden");
      startPanel?.classList.add("entry-pending");
      return;
    }
    entryMode = "";
    revealEntryGate();
  }

  function revealEntryGate() {
    if (entryMode === "guest") return;
    const shouldFocus = entryGate?.classList.contains("hidden")
      || document.activeElement === document.body
      || document.activeElement === document.documentElement;
    entryMode = "";
    overlay?.classList.remove("entry-checking");
    entryGate?.classList.remove("hidden");
    startPanel?.classList.add("entry-pending");
    requestAnimationFrame(() => {
      if (!shouldFocus || settingsVisible || entryGate?.classList.contains("hidden")) return;
      guestEntryButton?.focus({ preventScroll: true });
    });
  }

  function resolveEntryMode(mode, focus = true) {
    entryMode = mode === "account" ? "account" : "guest";
    writeSessionValue(ENTRY_MODE_SESSION_KEY, entryMode);
    if (entryMode === "guest") writeAccountHint(false);
    overlay?.classList.remove("entry-checking");
    entryGate?.classList.add("hidden");
    startPanel?.classList.remove("entry-pending");
    if (focus) startButton?.focus({ preventScroll: true });
  }

  async function initCloudAccount() {
    setAuthMode("code");
    const params = new URLSearchParams(window.location.search);
    const incomingRecoveryUserId = params.get("userId") || "";
    const incomingRecoverySecret = params.get("secret") || "";
    if (incomingRecoveryUserId || incomingRecoverySecret) {
      recoveryUserId = incomingRecoveryUserId;
      recoverySecret = incomingRecoverySecret;
      params.delete("userId");
      params.delete("secret");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
    if (!window.Appwrite?.Client || !window.Appwrite?.Account || !window.Appwrite?.TablesDB) {
      setAccountStatus("本地进度已就绪，正在连接云存档");
      if (document.readyState === "complete") loadAppwriteSdk();
      else window.addEventListener("load", () => loadAppwriteSdk(), { once: true });
      return;
    }
    const client = new window.Appwrite.Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID);
    accountSdk = {
      account: new window.Appwrite.Account(client),
      tables: new window.Appwrite.TablesDB(client),
      ID: window.Appwrite.ID,
      Permission: window.Appwrite.Permission,
      Role: window.Appwrite.Role
    };
    if (recoveryUserId && recoverySecret) {
      setAuthMode("password");
      if (accountPasswordInput) {
        accountPasswordInput.value = "";
        accountPasswordInput.placeholder = "输入新密码，至少 8 位";
        accountPasswordInput.autocomplete = "new-password";
      }
      if (accountSubmitButton) accountSubmitButton.textContent = "确认新密码";
      if (accountRecoveryButton) accountRecoveryButton.classList.add("hidden");
      setAccountStatus("改密链接已验证，请设置新密码", "valid");
    }
    await restoreAccountSession();
  }

  function loadAppwriteSdk() {
    if (accountSdk) return Promise.resolve(true);
    if (accountSdkLoadPromise) return accountSdkLoadPromise;
    setAccountStatus("正在连接云存档；本地游戏可正常使用");
    document.getElementById("appwriteSdk")?.remove();
    const script = document.createElement("script");
    script.id = "appwriteSdk";
    script.src = "vendor/appwrite-26.2.0.js";
    script.async = true;
    const pending = new Promise((resolve) => {
      script.addEventListener("load", async () => {
        try {
          await initCloudAccount();
          resolve(Boolean(accountSdk));
        } catch {
          accountSdk = null;
          script.remove();
          revealEntryGate();
          setAccountStatus("云服务连接失败，可在账号页重试；本地存档不受影响", "error");
          resolve(false);
        }
      }, { once: true });
      script.addEventListener("error", () => {
        script.remove();
        revealEntryGate();
        setAccountStatus("云服务暂时未载入，可在账号页重试；本地存档不受影响", "error");
        resolve(false);
      }, { once: true });
      document.head.append(script);
    });
    accountSdkLoadPromise = pending.finally(() => {
      accountSdkLoadPromise = null;
    });
    return accountSdkLoadPromise;
  }

  async function ensureAccountSdk() {
    if (accountSdk) return true;
    return loadAppwriteSdk();
  }

  async function restoreAccountSession() {
    if (!accountSdk) return;
    if (recoveryUserId && recoverySecret) {
      accountUser = null;
      revealEntryGate();
      syncAccountUi();
      setAccountStatus("改密链接已验证，请设置新密码", "valid");
      window.setTimeout(openAccountPanel, 0);
      return;
    }
    const configuredTimeout = Number(window.__summitAccountRestoreTimeoutMs);
    const timeoutMs = Number.isFinite(configuredTimeout)
      ? Math.max(50, configuredTimeout)
      : ACCOUNT_RESTORE_TIMEOUT_MS;
    let timeoutId = 0;
    try {
      const restoredUser = await Promise.race([
        accountSdk.account.get(),
        new Promise((_, reject) => {
          timeoutId = window.setTimeout(() => reject(Object.assign(new Error("account restore timeout"), { type: "restore_timeout" })), timeoutMs);
        })
      ]);
      accountUser = restoredUser;
      accountSessionGeneration += 1;
      await finishAccountLogin(accountSessionGeneration);
    } catch (error) {
      accountUser = null;
      accountSessionGeneration += 1;
      if (Number(error?.code) === 401) writeAccountHint(false);
      revealEntryGate();
      syncAccountUi();
      setAccountStatus(
        error?.type === "restore_timeout"
          ? "云端连接超时，可先以游客身份开始"
          : "进度保存在本机，登录后可同步",
        error?.type === "restore_timeout" ? "error" : ""
      );
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }

  function setAuthMode(mode) {
    authMode = mode === "password" ? "password" : "code";
    const recovering = Boolean(recoveryUserId && recoverySecret);
    document.querySelectorAll("[data-auth-mode]").forEach((button) => {
      const active = button.dataset.authMode === authMode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    accountAuthTabs?.classList.toggle("hidden", recovering);
    accountEmailField?.classList.toggle("hidden", recovering);
    accountNote?.classList.toggle("hidden", recovering);
    accountPasswordField?.classList.toggle("hidden", !recovering && authMode !== "password");
    accountRecoveryButton?.classList.toggle("hidden", recovering || authMode !== "password");
    accountCodeFields?.classList.toggle("hidden", recovering || authMode !== "code");
    if (accountPasswordLabel) accountPasswordLabel.textContent = recovering ? "新密码" : "密码";
    if (accountSubmitButton && !recoverySecret) {
      accountSubmitButton.textContent = authMode === "password" ? "使用密码登录" : "使用验证码继续";
    }
  }

  function syncAccountUi() {
    const signedIn = Boolean(accountUser);
    accountGuest?.classList.toggle("hidden", signedIn);
    accountUserPanel?.classList.toggle("hidden", !signedIn);
    if (accountSummary) {
      accountSummary.textContent = signedIn
        ? cloudInspectionPending
          ? "检查中"
          : cloudSyncReady
            ? "已同步"
            : "待确认"
        : "未登录";
    }
    if (startAccountButton) startAccountButton.textContent = signedIn ? "云存档 · 已登录" : "登录 · 云存档";
    syncCloudActionAvailability();
    if (!signedIn) return;
    const email = accountUser.email || "已登录账号";
    if (accountEmailLabel) accountEmailLabel.textContent = email;
    if (accountAvatar) accountAvatar.textContent = email.slice(0, 1).toUpperCase();
  }

  function setAccountStatus(message, state = "") {
    if (!accountStatus) return;
    accountStatus.textContent = message;
    accountStatus.classList.toggle("valid", state === "valid");
    accountStatus.classList.toggle("error", state === "error");
  }

  function friendlyAccountError(error) {
    const code = Number(error?.code || 0);
    const type = String(error?.type || "");
    if (code === 401) return "邮箱、密码或验证码不正确";
    if (code === 409) return "当前已有登录会话，请刷新后重试";
    if (code === 429) return "操作过于频繁，请稍后再试";
    if (type.includes("dictionary")) return "这个密码过于常见，请换一个更安全的密码";
    if (type.includes("personal_data")) return "密码不能包含邮箱或账号信息";
    if (type.includes("history")) return "请勿重复使用最近设置过的密码";
    if (type.includes("password")) return "密码至少 8 位，并请检查原密码";
    if (type.includes("email")) return "请填写有效邮箱";
    if (type.includes("token")) return "验证码已失效，请重新发送";
    if (code >= 500) return "云服务暂时不可用，本地存档不受影响";
    return error?.message ? String(error.message).slice(0, 100) : "操作失败，请稍后重试";
  }

  function validAccountEmail() {
    const email = (accountEmailInput?.value || "").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
  }

  function clearAccountOtpState({ clearCode = true } = {}) {
    accountTokenUserId = "";
    accountTokenEmail = "";
    removeSessionValue(ACCOUNT_OTP_SESSION_KEY);
    removeSessionValue(ACCOUNT_OTP_EMAIL_SESSION_KEY);
    if (clearCode && accountCodeInput) accountCodeInput.value = "";
  }

  async function sendAccountCode() {
    if (cloudSyncBusy || !await ensureAccountSdk() || accountUser) return;
    const email = validAccountEmail();
    if (!email) {
      setAccountStatus("请先填写有效邮箱", "error");
      accountEmailInput?.focus();
      return;
    }
    clearAccountOtpState();
    setAccountBusy(true);
    setAccountStatus("正在发送验证码…");
    try {
      const token = await accountSdk.account.createEmailToken({
        userId: accountSdk.ID.unique(),
        email,
        phrase: true
      });
      accountTokenUserId = token.userId || "";
      accountTokenEmail = email;
      writeSessionValue(ACCOUNT_OTP_SESSION_KEY, accountTokenUserId);
      writeSessionValue(ACCOUNT_OTP_EMAIL_SESSION_KEY, accountTokenEmail);
      if (accountCodeInput) accountCodeInput.value = "";
      const phrase = token.phrase ? `，安全短语：${token.phrase}` : "";
      setAccountStatus(`验证码已发送${phrase}`, "valid");
      accountCodeInput?.focus();
    } catch (error) {
      setAccountStatus(friendlyAccountError(error), "error");
    } finally {
      setAccountBusy(false);
    }
  }

  async function submitAccountLogin() {
    if (cloudSyncBusy || !await ensureAccountSdk() || accountUser) return;
    if (recoveryUserId && recoverySecret) {
      const password = accountPasswordInput?.value || "";
      if (password.length < 8) {
        setAccountStatus("新密码至少 8 位", "error");
        return;
      }
      setAccountBusy(true);
      try {
        await accountSdk.account.updateRecovery({ userId: recoveryUserId, secret: recoverySecret, password });
        recoveryUserId = "";
        recoverySecret = "";
        if (accountPasswordInput) {
          accountPasswordInput.value = "";
          accountPasswordInput.placeholder = "至少 8 位";
          accountPasswordInput.autocomplete = "current-password";
        }
        setAccountStatus("密码已更新，现在可以密码登录", "valid");
        setAuthMode("password");
        syncSettingsVisibility();
      } catch (error) {
        setAccountStatus(friendlyAccountError(error), "error");
      } finally {
        setAccountBusy(false);
      }
      return;
    }

    const email = validAccountEmail();
    if (!email) {
      setAccountStatus("请先填写有效邮箱", "error");
      accountEmailInput?.focus();
      return;
    }
    let otpUserId = "";
    let otpSecret = "";
    if (authMode === "code") {
      otpUserId = accountTokenUserId || readSessionValue(ACCOUNT_OTP_SESSION_KEY);
      const otpEmail = accountTokenEmail || readSessionValue(ACCOUNT_OTP_EMAIL_SESSION_KEY);
      otpSecret = (accountCodeInput?.value || "").trim();
      if (!otpUserId || !otpEmail || !otpSecret) {
        setAccountStatus("请先发送并填写验证码", "error");
        return;
      }
      if (otpEmail !== email) {
        clearAccountOtpState();
        setAccountStatus("邮箱已更改，请重新获取验证码", "error");
        accountEmailInput?.focus();
        return;
      }
    }
    setAccountBusy(true);
    setAccountStatus("正在登录…");
    try {
      if (authMode === "password") {
        const password = accountPasswordInput?.value || "";
        if (password.length < 8) throw new Error("密码至少 8 位");
        await accountSdk.account.createEmailPasswordSession({ email, password });
        if (accountPasswordInput) accountPasswordInput.value = "";
      } else {
        await accountSdk.account.createSession({ userId: otpUserId, secret: otpSecret });
        clearAccountOtpState();
      }
      accountUser = await accountSdk.account.get();
      accountSessionGeneration += 1;
      const loginGeneration = accountSessionGeneration;
      setAccountBusy(false);
      await finishAccountLogin(loginGeneration);
    } catch (error) {
      setAccountStatus(friendlyAccountError(error), "error");
    } finally {
      setAccountBusy(false);
    }
  }

  async function sendPasswordRecovery() {
    if (cloudSyncBusy || !await ensureAccountSdk() || accountUser) return;
    const email = validAccountEmail();
    if (!email) {
      setAccountStatus("请先填写要找回的邮箱", "error");
      return;
    }
    setAccountBusy(true);
    try {
      await accountSdk.account.createRecovery({
        email,
        url: `${window.location.origin}${window.location.pathname}`
      });
      setAccountStatus("改密邮件已发送，请从邮件链接返回设置新密码", "valid");
    } catch (error) {
      setAccountStatus(friendlyAccountError(error), "error");
    } finally {
      setAccountBusy(false);
    }
  }

  async function finishAccountLogin(expectedGeneration = accountSessionGeneration) {
    if (!accountUser || expectedGeneration !== accountSessionGeneration) return;
    cloudRow = null;
    cloudSyncReady = false;
    cloudInspectionPending = false;
    cloudRemoteUsable = false;
    cloudUploadPermitted = false;
    cloudSaveDirty = false;
    cloudSyncFlushRequested = false;
    cloudSyncRetryBlocked = false;
    lastCloudArchiveHash = "";
    writeAccountHint(true);
    resolveEntryMode("account", false);
    syncAccountUi();
    setAccountStatus("登录成功，正在比较本地与云端进度…", "valid");
    await inspectCloudSave(expectedGeneration);
  }

  async function inspectCloudSave(expectedGeneration = accountSessionGeneration) {
    if (!accountSdk || !accountUser) return;
    const expectedUserId = accountUser.$id;
    const sessionIsCurrent = () => expectedGeneration === accountSessionGeneration
      && accountUser?.$id === expectedUserId;
    cloudSyncReady = false;
    cloudInspectionPending = true;
    cloudRemoteUsable = false;
    cloudUploadPermitted = false;
    setCloudStatus("正在检查云端进度", "检查中");
    syncCloudActionAvailability();
    let inspectedRow = null;
    try {
      inspectedRow = await accountSdk.tables.getRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: APPWRITE_SAVES_TABLE_ID,
        rowId: expectedUserId
      });
    } catch (error) {
      if (!sessionIsCurrent()) return;
      if (Number(error?.code) !== 404) {
        cloudInspectionPending = false;
        syncCloudActionAvailability();
        setCloudStatus("云端读取失败", "读取失败");
        setAccountStatus(friendlyAccountError(error), "error");
        return;
      }
    }
    if (!sessionIsCurrent()) return;
    cloudRow = inspectedRow;
    cloudInspectionPending = false;
    if (!cloudRow) {
      cloudSyncReady = true;
      cloudUploadPermitted = true;
      syncCloudActionAvailability();
      setCloudStatus("首次同步，正在上传本地进度", "同步中");
      await uploadCloudSave({ force: true });
      return;
    }
    let remote;
    try {
      remote = normalizeSaveArchiveText(cloudRow.archive);
    } catch {
      cloudUploadPermitted = true;
      syncCloudActionAvailability();
      setCloudStatus("云端存档无法识别", "存档异常");
      setAccountStatus("云端存档损坏，本地进度尚未覆盖它", "error");
      return;
    }
    cloudRemoteUsable = true;
    cloudUploadPermitted = true;
    syncCloudActionAvailability();
    const localArchive = buildSaveArchive();
    const remoteHash = archiveFingerprint(JSON.parse(cloudRow.archive));
    const localHash = archiveFingerprint(localArchive);
    if (remoteHash === localHash) {
      lastCloudArchiveHash = localHash;
      cloudSyncReady = true;
      cloudSaveDirty = false;
      setCloudStatus(`已同步 · ${formatCloudTime(cloudRow.$updatedAt)}`);
      setAccountStatus("本地与云端进度一致", "valid");
      return;
    }
    if (!hasMeaningfulLocalProgress() && hasMeaningfulNormalizedProgress(remote)) {
      await downloadCloudSave();
      return;
    }
    setCloudStatus(`发现不同进度 · ${formatCloudTime(cloudRow.$updatedAt)}`);
    setAccountStatus("请选择“使用云端”或“上传本地”，确认后将自动同步");
  }

  function hasMeaningfulSettings(value) {
    const defaults = defaultSettings();
    const normalized = normalizeSettings(value, defaults);
    const baseline = normalizeSettings({}, defaults);
    return JSON.stringify(normalized) !== JSON.stringify(baseline);
  }

  function hasMeaningfulProfile(value) {
    const candidate = normalizeProfile(value);
    return candidate.summitClears > 0
      || candidate.bestDeathCount !== null
      || candidate.bestRelayChain > 0
      || candidate.bestFlowPeak > 0
      || candidate.lastClearTime > 0
      || Boolean(candidate.lastClearAt)
      || Object.keys(candidate.challengeWins).length > 0;
  }

  function hasMeaningfulRoomFocus(entries) {
    return entries.some((entry) => {
      if (!entry || typeof entry !== "object") return false;
      if (entry.last && entry.last !== "none") return true;
      return Object.entries(entry).some(([key, value]) => key !== "schemaVersion" && key !== "last" && Number(value) > 0);
    });
  }

  function hasMeaningfulRoomPaths(paths) {
    return paths.some((path) => Array.isArray(path) && path.length > 0);
  }

  function hasMeaningfulSaveData({ settings: savedSettings, profile: savedProfile, roomBests, roomPaths, roomFocus: savedFocus, bestTime: savedBestTime, bestFlow: savedBestFlow }) {
    return hasMeaningfulSettings(savedSettings)
      || hasMeaningfulProfile(savedProfile)
      || roomBests.some((value) => value > 0)
      || hasMeaningfulRoomPaths(roomPaths)
      || hasMeaningfulRoomFocus(savedFocus)
      || savedBestTime > 0
      || savedBestFlow > 0;
  }

  function hasMeaningfulLocalProgress() {
    return hasMeaningfulSaveData({
      settings,
      profile,
      roomBests: bestRoomTimes,
      roomPaths: bestRoomPaths,
      roomFocus,
      bestTime: readBestTime(),
      bestFlow: readBestFlow()
    });
  }

  function hasMeaningfulNormalizedProgress(normalized) {
    return hasMeaningfulSaveData(normalized);
  }

  function archiveFingerprint(archive) {
    const copy = {
      kind: archive?.kind || "",
      schemaVersion: archive?.schemaVersion || 0,
      storage: archive?.storage || {}
    };
    const text = JSON.stringify(copy);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function formatCloudTime(value) {
    if (!value) return "刚刚";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "刚刚";
    return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function setCloudStatus(message, summary = "") {
    if (cloudSyncStatus) cloudSyncStatus.textContent = message;
    if (accountSummary) accountSummary.textContent = accountUser ? (summary || (cloudSyncReady ? "已同步" : "待确认")) : "未登录";
  }

  function syncCloudActionAvailability() {
    const signedIn = Boolean(accountUser);
    if (cloudUploadButton) cloudUploadButton.disabled = !signedIn || cloudSyncBusy || cloudInspectionPending || !cloudUploadPermitted;
    if (cloudDownloadButton) cloudDownloadButton.disabled = !signedIn || cloudSyncBusy || cloudInspectionPending || !cloudRemoteUsable;
  }

  function setAccountBusy(busy) {
    cloudSyncBusy = busy;
    accountGroup?.setAttribute("aria-busy", String(busy));
    [
      ...document.querySelectorAll("[data-auth-mode]"),
      accountEmailInput,
      accountPasswordInput,
      accountCodeInput,
      accountNewPasswordInput,
      accountOldPasswordInput,
      accountSendCodeButton,
      accountSubmitButton,
      accountRecoveryButton,
      accountSetPasswordButton,
      accountLogoutButton
    ].forEach((button) => {
      if (button) button.disabled = busy;
    });
    syncCloudActionAvailability();
    if (!busy) queueMicrotask(resumeQueuedCloudSave);
  }

  async function uploadCloudSave({ force = false } = {}) {
    if (!accountSdk || !accountUser || cloudSyncBusy || cloudInspectionPending || !cloudUploadPermitted || (!cloudSyncReady && !force)) return false;
    const archive = buildSaveArchive();
    const archiveText = JSON.stringify(archive);
    if (archiveText.length > SAVE_ARCHIVE_MAX_CHARS) {
      setAccountStatus("存档过大，暂时无法上传", "error");
      return false;
    }
    const fingerprint = archiveFingerprint(archive);
    if (!force && fingerprint === lastCloudArchiveHash) {
      cloudSaveDirty = false;
      setCloudStatus(`已同步 · ${formatCloudTime(cloudRow?.$updatedAt)}`);
      return true;
    }
    if (cloudSyncTimer) {
      window.clearTimeout(cloudSyncTimer);
      cloudSyncTimer = 0;
    }
    cloudSaveDirty = false;
    cloudSyncRetryBlocked = false;
    let uploadSucceeded = false;
    setAccountBusy(true);
    setCloudStatus("正在同步…", "同步中");
    try {
      const userRole = accountSdk.Role.user(accountUser.$id);
      const uploadedRow = await accountSdk.tables.upsertRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: APPWRITE_SAVES_TABLE_ID,
        rowId: accountUser.$id,
        data: { build: archive.build, archive: archiveText },
        permissions: [
          accountSdk.Permission.read(userRole),
          accountSdk.Permission.update(userRole),
          accountSdk.Permission.delete(userRole)
        ]
      });
      cloudRow = { ...uploadedRow, archive: uploadedRow.archive || archiveText };
      cloudRemoteUsable = true;
      cloudUploadPermitted = true;
      lastCloudArchiveHash = fingerprint;
      cloudSyncReady = true;
      setCloudStatus(`已同步 · ${formatCloudTime(cloudRow.$updatedAt)}`);
      setAccountStatus("进度已安全保存到云端", "valid");
      uploadSucceeded = true;
      return true;
    } catch (error) {
      cloudSaveDirty = true;
      cloudSyncRetryBlocked = true;
      setCloudStatus("同步失败，本地进度已保留", "同步失败");
      setAccountStatus(friendlyAccountError(error), "error");
      return false;
    } finally {
      setAccountBusy(false);
      if (uploadSucceeded && cloudSaveDirty && accountUser && cloudSyncReady) {
        setCloudStatus("有新进度等待同步", "待同步");
        if (cloudSyncFlushRequested) {
          cloudSyncFlushRequested = false;
          uploadCloudSave();
        } else {
          armCloudSyncTimer();
        }
      } else if (!cloudSaveDirty) {
        cloudSyncFlushRequested = false;
      }
    }
  }

  async function downloadCloudSave() {
    if (!accountSdk || !accountUser || !cloudRow?.archive || !cloudRemoteUsable || cloudSyncBusy || cloudInspectionPending) return;
    setAccountBusy(true);
    try {
      const normalized = normalizeSaveArchiveText(cloudRow.archive);
      writeNormalizedSaveArchive(normalized);
      cloudSyncReady = true;
      setAccountStatus("云端进度已载入，正在刷新…", "valid");
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      setAccountStatus(friendlyAccountError(error), "error");
      setAccountBusy(false);
    }
  }

  async function setAccountPassword() {
    if (!accountSdk || !accountUser || cloudSyncBusy) return;
    const password = accountNewPasswordInput?.value || "";
    if (password.length < 8) {
      setAccountStatus("新密码至少 8 位", "error");
      return;
    }
    setAccountBusy(true);
    try {
      const oldPassword = accountOldPasswordInput?.value || "";
      await accountSdk.account.updatePassword(oldPassword ? { password, oldPassword } : { password });
      if (accountNewPasswordInput) accountNewPasswordInput.value = "";
      if (accountOldPasswordInput) accountOldPasswordInput.value = "";
      setAccountStatus("密码已更新", "valid");
    } catch (error) {
      setAccountStatus(friendlyAccountError(error), "error");
    } finally {
      setAccountBusy(false);
    }
  }

  async function logoutAccount() {
    if (!accountSdk || !accountUser || cloudSyncBusy) return;
    let refreshCloudAfterFailure = false;
    try {
      if (cloudSyncReady) {
        const synced = await uploadCloudSave();
        if (!synced) {
          setAccountStatus("最后一次云同步失败，账号仍保持登录；请检查网络后重试退出", "error");
          return;
        }
      }
      if (cloudSyncTimer) {
        window.clearTimeout(cloudSyncTimer);
        cloudSyncTimer = 0;
      }
      accountSessionGeneration += 1;
      setAccountBusy(true);
      await accountSdk.account.deleteSession({ sessionId: "current" });
      accountUser = null;
      cloudRow = null;
      cloudSyncReady = false;
      cloudInspectionPending = false;
      cloudRemoteUsable = false;
      cloudUploadPermitted = false;
      cloudSaveDirty = false;
      cloudSyncFlushRequested = false;
      cloudSyncRetryBlocked = false;
      lastCloudArchiveHash = "";
      syncAccountUi();
      setCloudStatus("未登录");
      setAccountStatus("已退出；本地进度仍保留", "valid");
      removeSessionValue(ENTRY_MODE_SESSION_KEY);
      writeAccountHint(false);
      clearAccountOtpState();
      if (accountPasswordInput) accountPasswordInput.value = "";
      if (accountNewPasswordInput) accountNewPasswordInput.value = "";
      if (accountOldPasswordInput) accountOldPasswordInput.value = "";
      if (!started) {
        revealEntryGate();
        closeSettings();
      }
    } catch (error) {
      accountSessionGeneration += 1;
      refreshCloudAfterFailure = Boolean(accountUser);
      setAccountStatus(friendlyAccountError(error), "error");
    } finally {
      setAccountBusy(false);
      if (refreshCloudAfterFailure) inspectCloudSave(accountSessionGeneration);
    }
  }

  function scheduleCloudSave() {
    if (!accountUser || !cloudSyncReady) return;
    cloudSaveDirty = true;
    cloudSyncRetryBlocked = false;
    setCloudStatus("有新进度等待同步", "待同步");
    if (cloudSyncBusy) return;
    armCloudSyncTimer();
  }

  function armCloudSyncTimer() {
    if (cloudSyncTimer) window.clearTimeout(cloudSyncTimer);
    cloudSyncTimer = window.setTimeout(() => {
      cloudSyncTimer = 0;
      uploadCloudSave();
    }, CLOUD_SYNC_DELAY_MS);
  }

  function resumeQueuedCloudSave() {
    if (!cloudSaveDirty
      || !accountUser
      || !cloudSyncReady
      || cloudSyncBusy
      || cloudInspectionPending
      || cloudSyncRetryBlocked
      || cloudSyncTimer) return;
    setCloudStatus("有新进度等待同步", "待同步");
    if (cloudSyncFlushRequested) {
      cloudSyncFlushRequested = false;
      uploadCloudSave();
    } else {
      armCloudSyncTimer();
    }
  }

  function flushPendingCloudSave() {
    if (!cloudSaveDirty || !accountUser || !cloudSyncReady) return;
    cloudSyncRetryBlocked = false;
    if (cloudSyncBusy) {
      cloudSyncFlushRequested = true;
      return;
    }
    if (cloudSyncTimer) {
      window.clearTimeout(cloudSyncTimer);
      cloudSyncTimer = 0;
    }
    uploadCloudSave();
  }

  function setSaveImportStatus(text, state = "") {
    if (!saveImportStatus) return;
    saveImportStatus.textContent = text;
    saveImportStatus.classList.toggle("valid", state === "valid");
    saveImportStatus.classList.toggle("error", state === "error");
  }

  function readSaveBackup() {
    try {
      const backup = JSON.parse(localStorage.getItem(SAVE_BACKUP_KEY) || "null");
      return parseSaveBackupValue(backup, (archive) => {
        normalizeSaveArchiveText(JSON.stringify(archive));
      });
    } catch {
      return null;
    }
  }

  function saveBackupSummary(backup) {
    const savedAt = typeof backup.savedAt === "string" ? backup.savedAt.slice(0, 19).replace("T", " ") : "未知时间";
    const archive = backup.archive || {};
    const build = typeof archive.build === "string" && archive.build ? archive.build : "未知版本";
    return `可恢复：${build} / ${savedAt}`;
  }

  function updateSaveBackupStatus() {
    const backup = readSaveBackup();
    if (saveBackupStatus) {
      saveBackupStatus.textContent = backup ? saveBackupSummary(backup) : "暂无导入前备份";
      saveBackupStatus.classList.toggle("valid", Boolean(backup));
      saveBackupStatus.classList.toggle("error", false);
    }
    if (saveRestoreButton) {
      saveRestoreButton.disabled = !backup;
      saveRestoreButton.title = backup ? "恢复导入前备份；当前档案会先成为新的备份" : "暂无可恢复的导入前备份";
    }
    return backup;
  }

  function updateSaveImportPreview() {
    const text = (saveImportText?.value || "").trim();
    if (!text) {
      setSaveImportStatus("等待存档 JSON");
      return null;
    }
    try {
      const result = normalizeSaveArchiveText(text);
      setSaveImportStatus(saveArchiveSummary(result), "valid");
      return result;
    } catch (error) {
      setSaveImportStatus(error.message || "存档 JSON 无法识别", "error");
      return null;
    }
  }

  function saveArchiveSummary(result) {
    const build = result.sourceBuild || "未知版本";
    const cleared = result.profile.summitClears || 0;
    const bestFlowValue = Math.floor(result.bestFlow || 0);
    const bestRooms = result.roomBests.filter((value) => value > 0).length;
    return `可导入：${build} / 登顶 ${cleared} / 房间 PB ${bestRooms}/${maps.length} / Flow ${bestFlowValue} / 触控 ${result.settings.touchSize}px`;
  }

  async function copySaveArchive() {
    const archive = buildSaveArchive();
    const text = JSON.stringify(archive, null, 2);
    if (saveImportText) {
      saveImportText.value = text;
      updateSaveImportPreview();
    }
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) downloadSaveArchive(text, archive.build);
    const verb = copied ? "已复制" : "已下载";
    setGameStatus(`存档${verb}，可迁移到其他浏览器`);
    showGameTip(`存档${verb}`, "包含设置、长期档案、房间成绩和路线记录", "storage", GAME_TIP_TIME, 3);
    playSound("ui", 0.7);
  }

  function downloadSaveArchiveAction() {
    const archive = buildSaveArchive();
    const text = JSON.stringify(archive, null, 2);
    if (saveImportText) {
      saveImportText.value = text;
      updateSaveImportPreview();
    }
    downloadSaveArchive(text, archive.build);
    setGameStatus("存档已下载");
    showGameTip("存档已下载", "可用同一面板导入 summit-spark-save JSON", "storage", GAME_TIP_TIME, 3);
    playSound("ui", 0.7);
  }

  function downloadSaveArchive(text, build) {
    downloadTextFile(text, `summit-spark-save-${build || "dev"}.json`, "application/json");
  }

  function importSaveArchiveFromText() {
    const text = (saveImportText?.value || "").trim();
    if (!text) {
      setGameStatus("请先粘贴存档 JSON");
      setSaveImportStatus("等待存档 JSON");
      showGameTip("缺少存档 JSON", "导出后复制或粘贴 summit-spark-save 内容", "storage", GAME_TIP_TIME, 3);
      return;
    }
    let result;
    try {
      result = importSaveArchive(text);
    } catch (error) {
      setGameStatus("存档导入失败");
      setSaveImportStatus(error.message || "存档 JSON 无法识别", "error");
      showGameTip("存档导入失败", error.message || "JSON 无法识别", "death", GAME_TIP_TIME, 3);
      return;
    }
    setSaveImportStatus(`已导入：${saveArchiveSummary(result)}`, "valid");
    setGameStatus("存档已导入，正在刷新");
    showGameTip("存档已导入", "旧档已本地备份，刷新后使用导入档案", "storage", GAME_TIP_TIME, 3);
    playSound("ui", 0.74);
    window.setTimeout(() => window.location.reload(), 520);
  }

  function restoreSaveBackup() {
    const backup = updateSaveBackupStatus();
    if (!backup) {
      setGameStatus("暂无可恢复的导入前备份");
      showGameTip("暂无备份", "导入存档后才会生成导入前备份", "storage", GAME_TIP_TIME, 3);
      return;
    }
    let result;
    try {
      result = importSaveArchive(JSON.stringify(backup.archive));
    } catch (error) {
      setGameStatus("备份恢复失败");
      if (saveBackupStatus) {
        saveBackupStatus.textContent = error.message || "备份无法识别";
        saveBackupStatus.classList.remove("valid");
        saveBackupStatus.classList.add("error");
      }
      showGameTip("备份恢复失败", error.message || "备份无法识别", "death", GAME_TIP_TIME, 3);
      return;
    }
    setSaveImportStatus(`已恢复：${saveArchiveSummary(result)}`, "valid");
    updateSaveBackupStatus();
    setGameStatus("备份已恢复，正在刷新");
    showGameTip("备份已恢复", "当前档案已先保存为新的备份", "storage", GAME_TIP_TIME, 3);
    playSound("ui", 0.74);
    window.setTimeout(() => window.location.reload(), 520);
  }

  function importSaveArchive(text) {
    const normalized = normalizeSaveArchiveText(text);
    writeNormalizedSaveArchive(normalized);
    return normalized;
  }

  function normalizeSaveArchiveText(text) {
    const parsed = parseSaveArchiveText(text, {
      maxChars: SAVE_ARCHIVE_MAX_CHARS,
      kind: SAVE_ARCHIVE_KIND
    });
    const source = parsed.storage;
    return {
      sourceBuild: parsed.sourceBuild,
      settings: normalizeSettings(source.settings, defaultSettings()),
      profile: normalizeProfile(source.profile),
      roomBests: normalizeRoomBests(source.roomBests),
      roomPaths: normalizeRoomPaths(source.roomPaths),
      roomFocus: normalizeRoomFocus(source.roomFocus),
      bestTime: finiteNonNegativeNumber(source.bestTime, 0, 36000),
      bestFlow: finiteNonNegativeNumber(source.bestFlow, 0, 999)
    };
  }

  function writeStorageTransaction(entries) {
    writeStorageTransactionData(localStorage, entries);
  }

  function writeNormalizedSaveArchive(normalized) {
    try {
      const backup = createCurrentSaveBackup(normalized.sourceBuild);
      writeStorageTransaction([
        [SAVE_BACKUP_KEY, JSON.stringify(backup)],
        [SETTINGS_KEY, JSON.stringify(normalized.settings)],
        [PROFILE_KEY, JSON.stringify(normalized.profile)],
        [ROOM_BESTS_KEY, JSON.stringify(normalized.roomBests)],
        [ROOM_PATHS_KEY, JSON.stringify(normalized.roomPaths)],
        [ROOM_FOCUS_KEY, JSON.stringify({
          schemaVersion: ROOM_FOCUS_SCHEMA_VERSION,
          rooms: normalized.roomFocus
        })],
        [BEST_TIME_KEY, String(normalized.bestTime)],
        [BEST_FLOW_KEY, String(Math.floor(normalized.bestFlow))]
      ]);
      window.__summitLastSaveBackup = backup;
    } catch {
      throw new Error("浏览器存档不可写");
    }
  }

  function createCurrentSaveBackup(sourceBuild = "") {
    return createSaveBackupData({
      sourceBuild,
      archive: buildSaveArchive(),
      savedAt: new Date().toISOString(),
    });
  }

  function focusGame() {
    if (settingsVisible) {
      if (!settingsPanel?.contains(document.activeElement)) settingsCloseButton?.focus({ preventScroll: true });
      return;
    }
    try {
      canvas.focus({ preventScroll: true });
    } catch {
      canvas.focus();
    }
  }

  function focusVisibleOverlaySurface() {
    if (settingsVisible || overlay.classList.contains("hidden") || overlay.hidden) return false;
    const finishTitle = overlay.classList.contains("finish-overlay")
      ? document.getElementById("finishTitle")
      : null;
    const preferred = finishTitle instanceof HTMLElement && finishTitle.getClientRects().length > 0
      ? finishTitle
      : startButton instanceof HTMLElement && startButton.isConnected && startButton.getClientRects().length > 0
        ? startButton
        : focusableElementsWithin(overlay)[0];
    if (!(preferred instanceof HTMLElement)) return false;
    preferred.focus({ preventScroll: true });
    return document.activeElement === preferred;
  }


  function setDebugVisible(value) {
    debugVisible = value;
    debugPanel.classList.toggle("hidden", !debugVisible);
    debugPanel.setAttribute("aria-hidden", String(!debugVisible));
    if (debugToggle) debugToggle.checked = debugVisible;
    updateDebug();
  }

  function toggleSettings() {
    if (settingsVisible && panelMode === "settings") {
      closeSettings();
      return;
    }
    openSettingsPanel();
  }

  function togglePracticePanel() {
    if (settingsVisible && panelMode === "practice") {
      closeSettings();
      return;
    }
    openStartTrainingPanel();
  }

  function closeSettings({ restoreFocus = true } = {}) {
    const returnTarget = panelReturnFocus;
    const closingPractice = panelMode === "practice";
    cancelKeyBindingCapture({ announce: false });
    panelReturnFocus = null;
    settingsVisible = false;
    releaseAllInputs();
    clearFocusResetConfirm();
    syncSettingsVisibility();
    setGameStatus(closingPractice ? "练习面板已关闭" : "设置已关闭");
    if (!restoreFocus) return;
    if (returnTarget instanceof HTMLElement && returnTarget.isConnected && !returnTarget.hasAttribute("disabled")) {
      returnTarget.focus({ preventScroll: true });
    } else if (!overlay.classList.contains("hidden")) {
      focusVisibleOverlaySurface();
    } else {
      focusGame();
    }
  }

  function closeSettingsFromTouch(event) {
    if (!settingsVisible) return;
    if (event.type === "pointerup" && event.pointerType !== "touch" && event.pointerType !== "pen") return;
    event.preventDefault();
    closeSettings();
  }

  function pointHitsVisibleElement(element, x, y) {
    if (!(element instanceof HTMLElement) || element.getClientRects().length === 0) return false;
    const rect = element.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function closeSettingsFromBackdrop(event) {
    if (!settingsVisible) return;
    const x = Number(event.clientX);
    const y = Number(event.clientY);
    const practiceTrigger = [practiceButton, openTrainingButton]
      .find((element) => pointHitsVisibleElement(element, x, y));
    if (practiceTrigger) {
      panelReturnFocus = practiceTrigger;
      accountFocused = false;
      openStartTrainingPanel();
      return;
    }
    if (pointHitsVisibleElement(startAccountButton, x, y)) {
      panelReturnFocus = startAccountButton;
      openAccountPanel();
      return;
    }
    closeSettings();
  }

  function closeSettingsFromOutside(event) {
    if (!settingsVisible || !settingsPanel || settingsPanel.contains(event.target)) return;
    if (event.target === settingsBackdrop) return;
    if (event.target instanceof Element && event.target.closest("#settingsButton")) return;
    const returnTarget = panelReturnFocus;
    closeSettings({ restoreFocus: false });
    requestAnimationFrame(() => {
      if (settingsVisible) return;
      const active = document.activeElement;
      const hasSafeFocus = active instanceof HTMLElement
        && active !== document.body
        && active !== document.documentElement
        && active.isConnected
        && !settingsPanel.contains(active);
      if (hasSafeFocus) return;
      if (returnTarget instanceof HTMLElement
        && returnTarget.isConnected
        && !returnTarget.hasAttribute("disabled")
        && returnTarget.getClientRects().length > 0) {
        returnTarget.focus({ preventScroll: true });
        if (document.activeElement === returnTarget) return;
      }
      if (!overlay.classList.contains("hidden")) focusVisibleOverlaySurface();
      else focusGame();
    });
  }

  function syncSettingsVisibility() {
    stage?.classList.toggle("settings-open", settingsVisible);
    settingsBackdrop?.classList.toggle("hidden", !settingsVisible);
    settingsPanel?.classList.toggle("hidden", !settingsVisible);
    settingsPanel?.classList.toggle("mode-settings", settingsVisible && panelMode === "settings");
    settingsPanel?.classList.toggle("mode-practice", settingsVisible && panelMode === "practice");
    settingsPanel?.classList.toggle("account-focused", settingsVisible && panelMode === "settings" && accountFocused);
    settingsPanel?.setAttribute("aria-hidden", String(!settingsVisible));
    if (settingsVisible) settingsPanel?.removeAttribute("inert");
    else settingsPanel?.setAttribute("inert", "");
    const practiceMode = panelMode === "practice";
    const recoveryMode = Boolean(accountFocused && recoveryUserId && recoverySecret);
    if (panelTitle) panelTitle.textContent = practiceMode ? "练习" : recoveryMode ? "设置新密码" : accountFocused ? "账号" : "设置";
    settingsCloseButton?.setAttribute("aria-label", practiceMode ? "关闭练习" : recoveryMode ? "关闭改密" : accountFocused ? "关闭账号" : "关闭设置");
    settingsButton?.setAttribute("aria-expanded", String(settingsVisible && panelMode === "settings"));
    practiceButton?.setAttribute("aria-expanded", String(settingsVisible && panelMode === "practice"));
    syncGameplayAccessibility();
    syncPlayModeClass();
  }

  function syncSettingsPanel() {
    syncSettingsVisibility();
    syncRoomSelect();
    if (shakeSlider) shakeSlider.value = String(settings.shake);
    if (debugToggle) debugToggle.checked = debugVisible;
    if (calmEffectsToggle) calmEffectsToggle.checked = settings.calmEffects;
    if (lowPerformanceToggle) lowPerformanceToggle.checked = settings.lowPerformance;
    if (practiceLinesToggle) practiceLinesToggle.checked = settings.practiceLines;
    if (ghostOpacitySlider) ghostOpacitySlider.value = String(settings.ghostOpacity);
    if (assistModeSelect) assistModeSelect.value = settings.assistMode;
    if (audioToggle) audioToggle.checked = settings.audioEnabled;
    if (audioVolumeSlider) audioVolumeSlider.value = String(settings.audioVolume);
    if (grabModeSelect) grabModeSelect.value = settings.grabMode;
    if (gamepadDeadzoneSlider) gamepadDeadzoneSlider.value = String(settings.gamepadDeadzone);
    if (touchSizeSlider) touchSizeSlider.value = String(settings.touchSize);
    syncKeyBindingEditor();
    syncComfortSettings();
    updateSaveBackupStatus();
    updateGamepadStatusOutput();
    updatePracticeCoach();
  }

  function syncComfortSettings() {
    stage?.classList.toggle("low-performance", settings.lowPerformance);
    stage?.classList.toggle("assist-active", assistActive());
    stage?.style.setProperty("--touch-size", `${settings.touchSize}px`);
  }

  function assistActive() {
    return settings.assistMode === "gentle";
  }

  function recordsEligible() {
    return !runUsedAssist && !assistActive();
  }

  function syncPlayModeClass() {
    const trainingActive = Boolean(activeDrill || activeChallenge || activeRouteContract || activeFeelFixture);
    stage?.classList.toggle("run-started", started && !won);
    stage?.classList.toggle("free-play", started && !won && !trainingActive);
    stage?.classList.toggle("training-active", started && !won && trainingActive);
    stage?.classList.toggle("timing-active", started && !won && timingArmed);
  }

  function setGameStatus(text) {
    if (!gameStatus || !text || text === lastGameStatus) return;
    lastGameStatus = text;
    gameStatus.textContent = text;
  }

  function focusResetArmed() {
    return performance.now() < focusResetConfirmUntil;
  }

  function updateFocusResetButton() {
    if (!focusResetButton) return;
    const armed = focusResetArmed();
    focusResetButton.textContent = armed ? "确认清空" : "清空";
    focusResetButton.classList.toggle("armed", armed);
    focusResetButton.title = armed ? "再次点击，清空所有训练统计" : "清空训练统计，需要二次确认";
  }

  function clearFocusResetConfirm() {
    focusResetConfirmUntil = 0;
    if (focusResetExpiryTimer) {
      window.clearTimeout(focusResetExpiryTimer);
      focusResetExpiryTimer = 0;
    }
    updateFocusResetButton();
  }

  function scheduleFocusResetExpiry() {
    if (focusResetExpiryTimer) window.clearTimeout(focusResetExpiryTimer);
    focusResetExpiryTimer = window.setTimeout(() => {
      focusResetExpiryTimer = 0;
      if (!focusResetArmed()) updateFocusResetButton();
    }, FOCUS_RESET_CONFIRM_MS + 32);
  }

  function confirmFocusReset() {
    if (focusResetArmed()) {
      clearFocusResetConfirm();
      return true;
    }
    focusResetConfirmUntil = performance.now() + FOCUS_RESET_CONFIRM_MS;
    scheduleFocusResetExpiry();
    updateFocusResetButton();
    setGameStatus("再次点击“确认清空”以清除专注训练统计");
    return false;
  }

  function defaultSettings() {
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      shake: SHAKE_INTENSITY,
      calmEffects: true,
      lowPerformance: false,
      controlsPreset: "comfort",
      keyboardLayout: "pc",
      customBindings: defaultBindingsForLayout("pc"),
      grabMode: "hold",
      gamepadDeadzone: GAMEPAD_DEADZONE_DEFAULT,
      touchSize: TOUCH_SIZE_DEFAULT,
      practiceLines: true,
      ghostOpacity: 0.75,
      assistMode: "off",
      audioEnabled: true,
      audioVolume: 0.35
    };
  }

  function readSettings() {
    const defaults = defaultSettings();
    return readStoredJson(SETTINGS_KEY, defaults, (saved) => normalizeSettings(saved, defaults));
  }

  function clampGamepadDeadzone(value) {
    return clampGamepadDeadzoneData(value, {
      min: GAMEPAD_DEADZONE_MIN,
      max: GAMEPAD_DEADZONE_MAX,
      fallback: GAMEPAD_DEADZONE_DEFAULT
    });
  }

  function clampTouchSize(value) {
    return clampTouchSizeData(value, {
      min: TOUCH_SIZE_MIN,
      max: TOUCH_SIZE_MAX,
      fallback: TOUCH_SIZE_DEFAULT
    });
  }

  function normalizeSettings(saved, defaults) {
    return normalizeSettingsData(saved, defaults, {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      bindingActions: BINDING_ACTIONS,
      defaultBindingsForLayout,
      validBindingCode,
      controlPresets: CONTROL_PRESETS,
      gamepadDeadzone: {
        min: GAMEPAD_DEADZONE_MIN,
        max: GAMEPAD_DEADZONE_MAX,
        fallback: GAMEPAD_DEADZONE_DEFAULT
      },
      touchSize: {
        min: TOUCH_SIZE_MIN,
        max: TOUCH_SIZE_MAX,
        fallback: TOUCH_SIZE_DEFAULT
      }
    });
  }

  function writeSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      scheduleCloudSave();
    } catch {
      // Settings are convenience only; gameplay should continue without storage.
    }
  }

  const SOUND_PRESETS = {
    ui: [{ type: "sine", from: 520, to: 740, gain: 0.026, time: 0.08 }],
    jump: [{ type: "triangle", from: 320, to: 520, gain: 0.04, time: 0.11 }],
    wall: [{ type: "square", from: 220, to: 360, gain: 0.034, time: 0.1 }],
    dash: [{ type: "sawtooth", from: 660, to: 280, gain: 0.034, time: 0.09 }],
    spark: [{ type: "triangle", from: 520, to: 920, gain: 0.043, time: 0.14 }],
    wallSpark: [{ type: "triangle", from: 420, to: 760, gain: 0.04, time: 0.13 }, { type: "sine", from: 260, to: 360, gain: 0.018, time: 0.12 }],
    prismSpark: [{ type: "sawtooth", from: 720, to: 1180, gain: 0.038, time: 0.16 }, { type: "triangle", from: 360, to: 520, gain: 0.019, time: 0.15 }],
    relay: [{ type: "sine", from: 640, to: 980, gain: 0.042, time: 0.13 }],
    chain: [{ type: "triangle", from: 760, to: 1240, gain: 0.052, time: 0.16 }],
    prism: [{ type: "sawtooth", from: 360, to: 860, gain: 0.045, time: 0.18 }],
    refill: [{ type: "sine", from: 480, to: 720, gain: 0.034, time: 0.12 }],
    spring: [{ type: "triangle", from: 260, to: 620, gain: 0.041, time: 0.13 }],
    wind: [{ type: "sine", from: 210, to: 380, gain: 0.024, time: 0.19 }, { type: "triangle", from: 420, to: 560, gain: 0.012, time: 0.16 }],
    checkpoint: [{ type: "sine", from: 460, to: 760, gain: 0.032, time: 0.15 }, { type: "triangle", from: 690, to: 920, gain: 0.014, time: 0.13 }],
    echo: [{ type: "sine", from: 300, to: 420, gain: 0.03, time: 0.16 }],
    recall: [{ type: "triangle", from: 760, to: 320, gain: 0.04, time: 0.18 }],
    crack: [{ type: "square", from: 460, to: 190, gain: 0.021, time: 0.07 }, { type: "triangle", from: 720, to: 310, gain: 0.012, time: 0.09 }],
    crumble: [{ type: "sawtooth", from: 180, to: 90, gain: 0.035, time: 0.16 }],
    land: [{ type: "triangle", from: 120, to: 90, gain: 0.022, time: 0.08 }],
    death: [{ type: "sawtooth", from: 240, to: 80, gain: 0.048, time: 0.18 }],
    clear: [{ type: "sine", from: 520, to: 880, gain: 0.038, time: 0.15 }, { type: "triangle", from: 780, to: 1120, gain: 0.026, time: 0.18 }]
  };
  function unlockAudio() {
    if (!settings.audioEnabled || audioContext) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    try {
      audioContext = new AudioCtor();
      audioMaster = audioContext.createGain();
      audioMaster.gain.value = Math.max(0, Math.min(0.7, settings.audioVolume));
      audioMaster.connect(audioContext.destination);
      ambientBus = audioContext.createGain();
      ambientBus.gain.value = 0.0001;
      ambientBus.connect(audioMaster);
      ambientNextTime = audioContext.currentTime;
    } catch {
      audioContext = null;
      audioMaster = null;
      ambientBus = null;
    }
  }

  function updateAmbientMusic(paused = false) {
    if (!audioContext || !ambientBus) return;
    const now = audioContext.currentTime;
    const audible = settings.audioEnabled && settings.audioVolume > 0 && started && !won && !paused;
    ambientBus.gain.setTargetAtTime(audible ? 1 : 0.0001, now, 0.35);
    if (!audible || audioContext.state !== "running") {
      ambientNextTime = now;
      return;
    }
    if (ambientNextTime > now + 0.6) return;
    const chapter = chapterIndexForRoom(roomIndex);
    const cue = ambientChapterCueData(chapter, ambientStep, flowScore);
    if (!cue) return;
    const start = Math.max(now + 0.05, ambientNextTime);
    cue.voices.forEach((voice) => {
      playAmbientTone(voice, start + voice.offset, cue.duration);
    });
    ambientStep += 1;
    ambientNextTime = start + cue.nextAfter;
  }

  function playAmbientTone(voice, start, duration) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = voice.type || "sine";
    osc.frequency.setValueAtTime(voice.frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(voice.gain, start + 0.55);
    gain.gain.setValueAtTime(voice.gain, start + duration * 0.68);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ambientBus);
    ambientVoices.set(osc, gain);
    osc.addEventListener("ended", () => ambientVoices.delete(osc), { once: true });
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function clearAmbientVoices() {
    if (!audioContext || ambientVoices.size === 0) return;
    const now = audioContext.currentTime;
    for (const [osc, gain] of ambientVoices) {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.0001, now, 0.018);
        osc.stop(now + 0.08);
      } catch {
        // A voice may already have ended between iteration and cancellation.
      }
    }
    ambientVoices.clear();
  }

  function playSound(name, intensity = 1) {
    if (!settings.audioEnabled || settings.audioVolume <= 0) return;
    unlockAudio();
    if (!audioContext || !audioMaster) return;
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    const preset = SOUND_PRESETS[name] || SOUND_PRESETS.ui;
    const now = audioContext.currentTime;
    const cooldown = name === "wind" ? 0.28 : name === "land" ? 0.08 : name === "crack" ? 0.06 : name === "ui" ? 0.04 : 0.035;
    if (Number.isFinite(soundCooldowns[name]) && now - soundCooldowns[name] < cooldown) return;
    soundCooldowns[name] = now;
    audioMaster.gain.setTargetAtTime(Math.max(0, Math.min(0.7, settings.audioVolume)), now, 0.01);
    preset.forEach((voice, index) => playTone(voice, now + index * 0.012, intensity));
  }

  function playScheduledCue(cue, intensity = 1) {
    if (!cue || !Array.isArray(cue.voices) || !settings.audioEnabled || settings.audioVolume <= 0) return;
    unlockAudio();
    if (!audioContext || !audioMaster) return;
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    const now = audioContext.currentTime;
    audioMaster.gain.setTargetAtTime(Math.max(0, Math.min(0.7, settings.audioVolume)), now, 0.01);
    cue.voices.forEach((voice) => playTone(voice, now + voice.offset, intensity));
  }

  function playChapterEntrySound(chapter, fromChapter) {
    playScheduledCue(chapterEntryCueData(chapter, fromChapter), 0.82);
  }

  function playSummitSound() {
    playScheduledCue(summitCueData(), 1);
  }

  function playAudioTestPattern() {
    unlockAudio();
    ["ui", "jump", "dash", "spark", "clear"].forEach((name, index) => {
      window.setTimeout(() => playSound(name, index === 4 ? 0.82 : 0.72), index * 120);
    });
  }

  function playTone(voice, start, intensity) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const duration = voice.time || 0.12;
    const volume = Math.max(0, Math.min(1, intensity)) * (voice.gain || 0.04);
    osc.type = voice.type || "sine";
    osc.frequency.setValueAtTime(voice.from || 440, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, voice.to || voice.from || 440), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(audioMaster);
    osc.start(start);
    osc.stop(start + duration + 0.025);
  }

  function spawnLightTrail(dx, dy) {
    const count = settings.lowPerformance ? 1 : settings.calmEffects ? 2 : 3;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2 + 7;
    const angle = Math.atan2(dy, dx);
    const color = player.overdrive > 0 ? palette.gold : palette.cyan;
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1);
      lightTrails.push({
        x: cx - dx * LIGHT_TRAIL_STEP * i,
        y: cy - dy * LIGHT_TRAIL_STEP * i + Math.sin(t * Math.PI) * 2,
        w: LIGHT_TRAIL_WIDTH - i * 5,
        h: LIGHT_TRAIL_HEIGHT,
        angle,
        color,
        life: LIGHT_TRAIL_LIFE - i * 0.055,
        max: LIGHT_TRAIL_LIFE,
        pulse: 0.08
      });
    }
    budgetEffectQueue("lightTrails", lightTrails);
  }

  function updateLightTrails(dt) {
    for (let i = lightTrails.length - 1; i >= 0; i--) {
      const trail = lightTrails[i];
      trail.life -= dt;
      trail.pulse = Math.max(0, trail.pulse - dt);
      if (trail.life <= 0) lightTrails.splice(i, 1);
    }
  }

  function drawLightTrails(time) {
    void time;
    for (const trail of lightTrails) {
      const age = Math.max(0, trail.life / trail.max);
      const pulse = trail.pulse > 0 ? 1 + trail.pulse * 0.9 : 1;
      const width = trail.w * pulse;
      const color = trail.color || palette.cyan;
      ctx.save();
      ctx.translate(trail.x, trail.y);
      ctx.rotate(trail.angle || 0);
      ctx.globalAlpha = Math.min(0.34, age * 0.32);
      ctx.shadowColor = color;
      ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 2 : 5);
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(1, trail.h * age);
      ctx.beginPath();
      ctx.moveTo(-width / 2, 0);
      ctx.lineTo(width / 2, 0);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha *= 0.45;
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(-width * 0.18, 0);
      ctx.lineTo(width * 0.28, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  function cutJump() {
    if (player.vy < -120 && player.dashTimer <= 0 && player.deadTimer <= 0) {
      player.vy *= JUMP_CUT_MULTIPLIER;
    }
  }

  function jumpHeld() {
    return keyHeldAny(actionCodes("jump")) || touch.jump || gamepadInput.jump;
  }

  function currentGravity(input) {
    if (!player.wasGrounded && Math.abs(player.vy) < APEX_WINDOW_SPEED && jumpHeld()) return GRAVITY * APEX_GRAVITY_MULT;
    if (player.vy < -40 && jumpHeld()) return GRAVITY * 0.82;
    if (input.y > 0 && player.vy > 40) return GRAVITY * FAST_FALL_GRAVITY_MULT;
    if (player.vy > 60) return GRAVITY * 1.08;
    return GRAVITY;
  }

  function toggleDebug() {
    setDebugVisible(!debugVisible);
  }

  function updateGlobalEffects(dt) {
    if (dt <= 0) {
      if (debugVisible) updateDebug();
      return;
    }
    const chapterBreathing = chapterTransitionTimer > 0;
    chapterTransitionTimer = Math.max(0, chapterTransitionTimer - dt);
    nearMissCooldown = Math.max(0, nearMissCooldown - dt);
    recallCooldown = Math.max(0, recallCooldown - dt);
    recallPulseTimer = Math.max(0, recallPulseTimer - dt);
    echoLessonTimer = Math.max(0, echoLessonTimer - dt);
    roomIntroTimer = Math.max(0, roomIntroTimer - dt);
    splitPopupTimer = Math.max(0, splitPopupTimer - (chapterBreathing ? 0 : dt));
    feelCueTimer = Math.max(0, feelCueTimer - dt);
    routeCueTimer = Math.max(0, routeCueTimer - (chapterBreathing ? 0 : dt));
    masteryPopupTimer = Math.max(0, masteryPopupTimer - (chapterBreathing ? 0 : dt));
    focusPopupTimer = Math.max(0, focusPopupTimer - (chapterBreathing ? 0 : dt));
    crumbleSlipTimer = Math.max(0, crumbleSlipTimer - dt);
    updateGameTip(dt);
    updateFlow(chapterBreathing ? 0 : dt);
    updateSummitReveal(dt);
    updateCrumblePlatforms(dt);
    for (const key of Object.keys(actionPulse)) {
      actionPulse[key] = Math.max(0, actionPulse[key] - dt);
    }
    if (shakeTimer > 0) {
      shakeTimer = Math.max(0, shakeTimer - dt);
      if (shakeTimer === 0) {
        shakePower = 0;
        shakeDuration = 0;
      }
    }
  }

  function shake(duration, power) {
    if (settings.shake <= 0) return;
    shakeTimer = Math.max(shakeTimer, duration);
    shakeDuration = Math.max(shakeDuration, duration);
    shakePower = Math.max(shakePower, power * settings.shake);
  }

  function shakeOffset() {
    if (shakeTimer <= 0 || shakeDuration <= 0) return { x: 0, y: 0 };
    const strength = shakePower * (shakeTimer / shakeDuration);
    return {
      x: (Math.random() * 2 - 1) * strength,
      y: (Math.random() * 2 - 1) * strength
    };
  }

  function crumbleTilesUnderPlayer() {
    if (player.deadTimer > 0 || !player.onGround) return [];
    const footY = Math.floor((player.y + player.h + 2) / TILE);
    if (footY < 0 || footY >= ROWS) return [];
    const minX = Math.max(0, Math.floor((player.x + 3) / TILE));
    const maxX = Math.min(COLS - 1, Math.floor((player.x + player.w - 4) / TILE));
    const keys = [];
    for (let x = minX; x <= maxX; x += 1) {
      if (room.tiles[footY]?.[x] === "C") keys.push(`${x}:${footY}`);
    }
    return keys;
  }

  function updateCrumblePlatforms(dt) {
    if (!room.entities.crumble || room.entities.crumble.size === 0) return;
    for (const key of crumbleTilesUnderPlayer()) {
      const block = room.entities.crumble.get(key);
      if (block && room.tiles[block.y]?.[block.x] === "C" && block.timer <= 0) {
        block.timer = CRUMBLE_BREAK_TIME;
        block.warned = true;
        crumbleSlipTimer = CRUMBLE_DEATH_MEMORY;
        markRoomTech("crumble");
        showMechanicFirstTouchCue("crumble");
        playSound("crack", 0.62);
        shake(0.035, 1.2);
        burst(block.x * TILE + TILE / 2, block.y * TILE + 6, "#e7f4f7", 5, 95);
      }
    }

    for (const block of room.entities.crumble.values()) {
      if (room.tiles[block.y]?.[block.x] !== "C" || block.timer <= 0) continue;
      block.timer = Math.max(0, block.timer - dt);
      if (block.timer <= 0) {
        room.tiles[block.y][block.x] = ".";
        crumbleSlipTimer = CRUMBLE_DEATH_MEMORY;
        playSound("crumble", 0.72);
        burst(block.x * TILE + TILE / 2, block.y * TILE + TILE / 2, palette.cyan, 12, 210);
        addSnow(block.x * TILE + TILE / 2, block.y * TILE + 4, 4);
      }
    }
  }

  function getWallDir() {
    const box = getPlayerBox();
    const left = { ...box, x: box.x - 2 };
    const right = { ...box, x: box.x + 2 };
    if (collidesSolid(left)) return -1;
    if (collidesSolid(right)) return 1;
    return 0;
  }

  function getPlayerBox() {
    return { x: player.x, y: player.y, w: player.w, h: player.h };
  }

  function collidesSolid(box) {
    const minX = Math.max(0, Math.floor(box.x / TILE));
    const maxX = Math.min(COLS - 1, Math.floor((box.x + box.w - 1) / TILE));
    const minY = Math.max(0, Math.floor(box.y / TILE));
    const maxY = Math.min(ROWS - 1, Math.floor((box.y + box.h - 1) / TILE));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (SOLID.has(room.tiles[y]?.[x])) return true;
      }
    }
    return false;
  }

  function touchingHazard(box) {
    const inset = { x: box.x + 4, y: box.y + 3, w: box.w - 8, h: box.h - 6 };
    const minX = Math.max(0, Math.floor(inset.x / TILE));
    const maxX = Math.min(COLS - 1, Math.floor((inset.x + inset.w - 1) / TILE));
    const minY = Math.max(0, Math.floor(inset.y / TILE));
    const maxY = Math.min(ROWS - 1, Math.floor((inset.y + inset.h - 1) / TILE));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (HAZARDS.has(room.tiles[y]?.[x])) return true;
      }
    }
    return false;
  }

  function nearHazard(box, padding) {
    const inset = {
      x: box.x - padding,
      y: box.y - padding,
      w: box.w + padding * 2,
      h: box.h + padding * 2
    };
    const minX = Math.max(0, Math.floor(inset.x / TILE));
    const maxX = Math.min(COLS - 1, Math.floor((inset.x + inset.w - 1) / TILE));
    const minY = Math.max(0, Math.floor(inset.y / TILE));
    const maxY = Math.min(ROWS - 1, Math.floor((inset.y + inset.h - 1) / TILE));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (HAZARDS.has(room.tiles[y]?.[x])) return true;
      }
    }
    return false;
  }

  function updateHair(dt) {
    const anchor = {
      x: player.x + player.w / 2 - player.facing * 5,
      y: player.y + 6
    };
    for (let i = 0; i < player.hair.length; i++) {
      const prev = i === 0 ? anchor : player.hair[i - 1];
      const strand = player.hair[i];
      const targetX = prev.x - player.facing * (3.2 + i * 0.18);
      const targetY = prev.y + 1.2 + Math.min(1.2, Math.max(-1.2, player.vy / 520));
      strand.x += (targetX - strand.x) * Math.min(1, dt * 22);
      strand.y += (targetY - strand.y) * Math.min(1, dt * 22);
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 280 * dt;
      p.rot += p.spin * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = shards.length - 1; i >= 0; i--) {
      const shard = shards[i];
      shard.life -= dt;
      if (shard.life <= 0) shards.splice(i, 1);
    }

    if (!prefersReducedMotion && dt > 0.012 && Math.random() < (settings.lowPerformance ? 0.16 : 0.5)) {
      particles.push({
        x: Math.random() * W,
        y: -8,
        vx: -8 - Math.random() * 18,
        vy: 20 + Math.random() * 35,
        life: 4,
        max: 4,
        size: 1 + Math.random() * 2,
        color: "rgba(236,249,255,0.85)",
        rot: 0,
        spin: 0
      });
    }
    budgetEffectQueue("particles", particles);
    budgetEffectQueue("shards", shards);
  }

  function currentEffectLimit(kind) {
    return effectQueueLimit(kind, {
      lowPerformance: settings.lowPerformance,
      reducedMotion: prefersReducedMotion,
      calmEffects: settings.calmEffects
    });
  }

  function budgetEffectQueue(kind, queue) {
    return enforceEffectQueueBudget(queue, currentEffectLimit(kind));
  }

  function addGhost(alpha) {
    const life = settings.calmEffects ? 0.16 : 0.18;
    const resolvedAlpha = settings.calmEffects ? Math.min(alpha, 0.3) : alpha;
    ghosts.push({
      x: player.x,
      y: player.y,
      facing: player.facing,
      life,
      max: life,
      alpha: resolvedAlpha
    });
    budgetEffectQueue("ghosts", ghosts);
  }

  function updateGhosts(dt) {
    for (let i = ghosts.length - 1; i >= 0; i--) {
      ghosts[i].life -= dt;
      if (ghosts[i].life <= 0) ghosts.splice(i, 1);
    }
  }

  function samplePlayerPath(dt) {
    if (player.deadTimer > 0 || won) return;
    pathSampleTimer -= dt;
    if (pathSampleTimer > 0) return;
    pathSampleTimer = PATH_SAMPLE_INTERVAL;
    const sample = {
      room: roomIndex,
      x: player.x + player.w / 2,
      y: player.y + player.h / 2,
      dash: player.dashTimer > 0,
      spark: player.sparkHopTimer > 0,
      over: player.overdrive > 0,
      t: roomTime
    };
    for (const point of recentPath) {
      point.age += PATH_SAMPLE_INTERVAL;
    }
    recentPath.push({ ...sample, age: 0 });
    roomPath.push(sample);
    while (recentPath.length > 0 && recentPath[0].age > RECENT_PATH_SECONDS) {
      recentPath.shift();
    }
    while (roomPath.length > MAX_ROOM_PATH_POINTS * 2) {
      roomPath.shift();
    }
  }

  function clearRecentPath() {
    recentPath.length = 0;
    pathSampleTimer = 0;
  }

  function clearRoomPath() {
    roomPath.length = 0;
  }

  function burst(x, y, color, count, speed) {
    const effectScale = settings.lowPerformance ? 0.42 : prefersReducedMotion ? 0.5 : settings.calmEffects ? 0.68 : 1;
    const budgetedCount = Math.max(2, Math.ceil(count * effectScale));
    for (let i = 0; i < budgetedCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const power = speed * (0.28 + Math.random() * 0.72);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power - 40,
        life: 0.28 + Math.random() * 0.48,
        max: 0.7,
        size: 2 + Math.random() * 5,
        color,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 8
      });
    }
    budgetEffectQueue("particles", particles);
  }

  function addSnow(x, y, count) {
    const budgetedCount = settings.lowPerformance ? Math.max(1, Math.ceil(count * 0.5)) : count;
    for (let i = 0; i < budgetedCount; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 80,
        vy: -80 - Math.random() * 100,
        life: 0.28 + Math.random() * 0.24,
        max: 0.6,
        size: 1 + Math.random() * 2,
        color: "rgba(236,249,255,0.8)",
        rot: 0,
        spin: 0
      });
    }
    budgetEffectQueue("particles", particles);
  }

  function glow(x, y, color) {
    if (Math.random() > 0.82) burst(x, y, color, 1, 80);
  }

  function render(time) {
    drawBackground(time);
    const offset = shakeOffset();
    ctx.save();
    ctx.translate(offset.x, offset.y);
    drawHazardFields(time);
    drawTiles(time);
    drawBestRoomPath(time);
    drawCurrentRoomPath(time);
    drawBestRoomGhost(time);
    drawRelayRoutes(time);
    drawVelocityWake(time);
    drawLightTrails(time);
    drawEntities(time);
    drawRequirementBeacons(time);
    drawRouteCompass(time);
    drawParticles();
    drawGhosts();
    drawSparkCue(time);
    drawDashAimPreview(time);
    drawInputCues(time);
    drawPlayerAura(time);
    if (player.deadTimer <= 0) drawPlayer(time);
    ctx.restore();
    drawFlowAtmosphere(time);
    drawTimingGateCue(time);
    drawRoomIntro(time);
    drawRouteFocusCue(time);
    drawFeelCue(time);
    drawMasteryPopup(time);
    drawSplitPopup(time);
    drawFocusPopup(time);
    drawDrillHud(time);
    drawActiveChallengeHud(time);
    drawPaceRibbon(time);
    drawChapterTransition(time);
    drawSummitReveal(time);
    drawVignette();
  }

  function drawSparkCue(time) {
    if (player.sparkHopTimer <= 0 || player.deadTimer > 0) return;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const charge = player.sparkHopTimer / SPARK_HOP_WINDOW;
    ctx.save();
    ctx.globalAlpha = 0.18 + charge * 0.42;
    ctx.strokeStyle = "#f8fbff";
    ctx.lineWidth = 2;
    ctx.shadowColor = palette.cyan;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 8 : 16);
    ctx.beginPath();
    ctx.arc(cx, cy, 18 + Math.sin(time * 28) * 1.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = palette.cyan;
    ctx.beginPath();
    ctx.arc(cx, cy, 11 + charge * 4, -Math.PI * 0.2, Math.PI * 1.25);
    ctx.stroke();
    ctx.restore();
  }

  function drawDashAimPreview(time) {
    if (!practiceVisualsActive() || player.deadTimer > 0 || player.dashes <= 0 || player.dashCooldown > 0) return;
    const input = getInput();
    let dx = input.x;
    let dy = input.y;
    if (dx === 0 && dy === 0 && lastAimTimer > 0) {
      dx = lastAimX;
      dy = lastAimY;
    }
    if (dx === 0 && dy === 0) dx = player.facing || 1;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const reach = DASH_AIM_PREVIEW_LENGTH * (player.overdrive > 0 ? 1.12 : 1);
    const endX = cx + dx * reach;
    const endY = cy + dy * reach;
    const pulse = 0.5 + Math.sin(time * 10) * 0.5;
    const armed = Math.max(actionPulse.dash, player.dashBuffer) / Math.max(ACTION_PULSE_TIME, DASH_BUFFER_TIME);
    const alpha = Math.min(0.72, DASH_AIM_PREVIEW_MIN_ALPHA + armed * 0.3 + pulse * 0.08);
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = player.overdrive > 0 ? palette.green : palette.cyan;
    ctx.fillStyle = player.overdrive > 0 ? palette.green : palette.cyan;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.shadowColor = player.overdrive > 0 ? palette.green : palette.cyan;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 5 : 11);
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.moveTo(cx + dx * 18, cy + dy * 18);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.translate(endX, endY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawInputCues(time) {
    if (player.deadTimer > 0) return;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const dash = Math.max(actionPulse.dash, player.dashBuffer) / Math.max(ACTION_PULSE_TIME, DASH_BUFFER_TIME);
    const grab = actionPulse.grab / ACTION_PULSE_TIME;
    const fall = actionPulse.fall / ACTION_PULSE_TIME;
    const wall = Math.max(actionPulse.wall, player.wallCoyote) / Math.max(ACTION_PULSE_TIME, WALL_COYOTE_TIME);

    if (dash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.82, dash);
      ctx.strokeStyle = palette.cyan;
      ctx.lineWidth = 2;
      ctx.shadowColor = palette.cyan;
      ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 6 : 12);
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4 + time * 2.6);
      ctx.strokeRect(-14 - dash * 5, -14 - dash * 5, 28 + dash * 10, 28 + dash * 10);
      ctx.restore();
    }

    if (grab > 0 || wall > 0) {
      const t = Math.max(grab, wall);
      const side = player.wallDir || player.wallCoyoteDir || player.facing;
      ctx.save();
      ctx.globalAlpha = Math.min(0.72, t);
      ctx.strokeStyle = grab > wall ? palette.green : palette.cyan;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.shadowColor = grab > wall ? palette.green : palette.cyan;
      ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 5 : 11);
      const x = cx + side * (player.w * 0.85 + 6);
      ctx.beginPath();
      ctx.moveTo(x, cy - 16);
      ctx.lineTo(x + side * 7, cy - 7);
      ctx.moveTo(x, cy + 16);
      ctx.lineTo(x + side * 7, cy + 7);
      ctx.stroke();
      ctx.restore();
    }

    if (fall > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.62, fall);
      ctx.strokeStyle = "rgba(248,251,255,0.86)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        const x = cx + i * 7;
        const y = cy + 18 + (1 - fall) * 12;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 10 + fall * 8);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawFeelCue(time) {
    void time;
    if (player.deadTimer > 0
      || feelCueTimer <= 0
      || !feelCueText
      || splitPopupTimer > 0
      || masteryPopupTimer > 0
      || focusPopupTimer > 0
      || chapterTransitionTimer > 0
      || summitRevealTimer > 0) return;
    const t = Math.max(0, Math.min(1, feelCueTimer / feelCueMax));
    ctx.save();
    ctx.font = "600 11px system-ui, sans-serif";
    const title = fitText(feelCueText, 120);
    const detail = feelCueDetail ? fitText(feelCueDetail, 180) : "";
    const width = Math.min(210, Math.max(78, Math.max(ctx.measureText(title).width, detail ? ctx.measureText(detail).width : 0) + 24));
    const height = detail ? 38 : 24;
    const compact = isCompactCanvas();
    const x = compact ? W / 2 - width / 2 : 18;
    const y = compact ? H - height - 18 : 68;
    const alpha = Math.min(1, t * 1.55);
    ctx.globalAlpha = alpha * 0.78;
    ctx.fillStyle = CANVAS_PANEL_BG;
    roundRect(ctx, x, y, width, height, 9);
    ctx.fill();
    ctx.strokeStyle = CANVAS_PANEL_STROKE;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 9);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = feelCueColor;
    roundRect(ctx, x + 6, y + 7, 3, height - 14, 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = CANVAS_PANEL_INK;
    ctx.fillText(title, x + 15, y + (detail ? 12 : height / 2));
    if (detail) {
      ctx.font = "600 9px system-ui, sans-serif";
      ctx.fillStyle = CANVAS_PANEL_MUTED;
      ctx.fillText(detail, x + 15, y + 27);
    }
    ctx.restore();
  }

  function drawRouteCompass(time) {
    if (!started || won || player.deadTimer > 0 || !routeCueActive()) return;
    const target = routeCompassTarget();
    if (!target) return;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    let dx = target.x - cx;
    let dy = target.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 28) return;
    dx /= dist;
    dy /= dist;
    const data = routeFocusData(roomIndex);
    const active = activeDrill && activeDrill.room === roomIndex;
    const fade = active ? 0.72 : Math.min(1, routeCueTimer / ROUTE_CUE_TIME);
    const length = Math.min(82, Math.max(44, dist * 0.23));
    const sx = cx + dx * 24;
    const sy = cy + dy * 20;
    const ex = sx + dx * length;
    const ey = sy + dy * length;
    void time;

    ctx.save();
    ctx.globalAlpha = (settings.calmEffects ? 0.16 : 0.25) * Math.min(1, fade * 1.4);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.setLineDash([6, 7]);
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.52 * Math.min(1, fade * 1.6);
    ctx.translate(ex, ey);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.strokeStyle = data.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(3, 0);
    ctx.lineTo(-5, 5);
    ctx.stroke();
    ctx.rotate(-Math.atan2(dy, dx));
    ctx.font = "600 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = fitText(target.label || routeSlotShort(data.slot), 64);
    const labelWidth = Math.min(76, Math.max(34, ctx.measureText(label).width + 12));
    ctx.globalAlpha = 0.64 * Math.min(1, fade * 1.5);
    ctx.fillStyle = CANVAS_PANEL_BG;
    roundRect(ctx, -labelWidth / 2, -30, labelWidth, 18, 7);
    ctx.fill();
    ctx.strokeStyle = CANVAS_PANEL_STROKE;
    ctx.lineWidth = 1;
    roundRect(ctx, -labelWidth / 2 + 0.5, -29.5, labelWidth - 1, 17, 7);
    ctx.stroke();
    ctx.globalAlpha = 0.82 * Math.min(1, fade * 1.5);
    ctx.fillStyle = CANVAS_PANEL_INK;
    ctx.fillText(label, 0, -21);
    ctx.restore();
  }

  function drawRouteFocusCue(time) {
    if (!started || won || player.deadTimer > 0 || !routeCueActive()) return;
    if (activeDrill && activeDrill.room === roomIndex) return;
    if (gameTipVisible("death")) return;
    const active = activeDrill && activeDrill.room === roomIndex;
    if (!active && roomIntroTimer > 0.18) return;
    const data = routeFocusData(roomIndex);
    const compact = isCompactCanvas();
    const fade = active ? 0.78 : Math.min(1, routeCueTimer / ROUTE_CUE_TIME);
    const alpha = Math.min(1, fade * 1.45);
    if (alpha <= 0) return;
    const width = compact ? 680 : 372;
    const height = compact ? 78 : 76;
    const x = compact ? W / 2 - width / 2 : W - width - 18;
    const y = compact || (active && roomIntroTimer > 0) ? H - 124 : active ? 128 : 86;
    void time;

    ctx.save();
    ctx.globalAlpha = alpha * 0.78;
    ctx.fillStyle = CANVAS_PANEL_BG;
    roundRect(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.strokeStyle = CANVAS_PANEL_STROKE;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 10);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.fillStyle = CANVAS_PANEL_INK;
    ctx.fillText(`${data.reason} · ${data.title}`, x + 14, y + 17);
    ctx.font = `600 ${compact ? 13 : 12}px system-ui, sans-serif`;
    ctx.fillStyle = CANVAS_PANEL_INK;
    ctx.fillText(fitText(data.core, width - 28), x + 14, y + 38);
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.fillStyle = "rgba(105,82,38,0.76)";
    ctx.fillText(fitText(data.detail, width - 28), x + 14, y + 57);
    drawRouteSegmentStrip(x + width - 156, y + 11, 138, 10, data.slot);
    ctx.restore();
  }

  function drawRouteSegmentStrip(x, y, width, height, activeSlot) {
    const labels = ["S", "F", "X"];
    const gap = 4;
    const segment = (width - gap * 2) / 3;
    ctx.save();
    ctx.font = "600 8px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    labels.forEach((label, index) => {
      const sx = x + index * (segment + gap);
      const active = index === activeSlot;
      const color = routeSlotColor(index);
      ctx.fillStyle = active ? `${color}2b` : "rgba(46,68,76,0.07)";
      ctx.strokeStyle = active ? `${color}aa` : "rgba(46,68,76,0.15)";
      ctx.lineWidth = active ? 1.3 : 1;
      roundRect(ctx, sx, y, segment, height, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = active ? "rgba(42,64,72,0.84)" : "rgba(42,64,72,0.55)";
      ctx.fillText(label, sx + segment / 2, y + height / 2 + 0.5);
    });
    ctx.restore();
  }

  function drawMasteryPopup(time) {
    if (masteryPopupTimer <= 0 || !masteryPopupText) return;
    const t = masteryPopupTimer / MASTERY_POPUP_TIME;
    const compact = isCompactCanvas();
    const width = compact ? 440 : 292;
    const height = masteryPopupDetail ? 56 : 38;
    const x = compact ? W / 2 - width / 2 : 18;
    const y = compact ? 28 : 24;
    const rise = (1 - t) * 8;
    void time;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.6) * 0.82;
    ctx.fillStyle = CANVAS_PANEL_BG;
    roundRect(ctx, x, y - rise, width, height, 10);
    ctx.fill();
    ctx.strokeStyle = CANVAS_PANEL_STROKE;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    roundRect(ctx, x + 0.5, y + 0.5 - rise, width - 1, height - 1, 10);
    ctx.stroke();
    ctx.globalAlpha = Math.min(1, t * 1.7);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = CANVAS_PANEL_INK;
    ctx.font = `600 ${compact ? 14 : 13}px system-ui, sans-serif`;
    ctx.fillText(fitText(masteryPopupText, width - 28), x + 14, y + (masteryPopupDetail ? 18 : height / 2) - rise);
    if (masteryPopupDetail) {
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.fillStyle = CANVAS_PANEL_MUTED;
      ctx.fillText(fitText(masteryPopupDetail, width - 28), x + 14, y + 39 - rise);
    }
    ctx.restore();
  }

  function practiceVisualsActive() {
    return settings.practiceLines && Boolean(activeDrill || activeRouteContract || activeFeelFixture);
  }

  function drawCurrentRoomPath(time) {
    if (!practiceVisualsActive() || roomPath.length < 2 || player.deadTimer > 0) return;
    const roomPoints = roomPath.filter((point) => point.room === roomIndex);
    const points = roomPoints.slice(-CURRENT_PATH_DRAW_POINTS);
    if (points.length < 2) return;
    const alpha = settings.ghostOpacity;
    ctx.save();
    ctx.globalAlpha = 0.22 * alpha;
    ctx.strokeStyle = player.overdrive > 0 ? palette.green : palette.cyan;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.globalAlpha = (0.28 + Math.sin(time * 8) * 0.05) * alpha;
    const last = points[points.length - 1];
    ctx.fillStyle = palette.cyan;
    ctx.fillRect(last.x - 3, last.y - 3, 6, 6);
    ctx.restore();
    const origin = roomPoints[0];
    drawReplayTag(origin.x, origin.y - 15, "本次", palette.cyan, 0.58 * alpha);
  }

  function drawBestRoomGhost(time) {
    if (!practiceVisualsActive() || player.deadTimer > 0) return;
    const path = bestRoomPaths[roomIndex];
    if (!Array.isArray(path) || path.length < 2) return;
    const rawIndex = pathIndexAtTime(path, roomTime, bestRoomTimes[roomIndex] || 0);
    const ghost = pointOnPath(path, rawIndex);
    if (!ghost) return;
    const replayState = replayGhostStateData(ghost);
    const pulse = 1 + Math.sin(time * 9) * 0.06;
    ctx.save();
    ctx.globalAlpha = 0.46 * settings.ghostOpacity;
    ctx.translate(ghost.x, ghost.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = palette.gold;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 6 : 12);
    ctx.fillStyle = "rgba(247,198,93,0.64)";
    roundRect(ctx, -7, -11, 14, 18, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(248,251,255,0.72)";
    ctx.fillRect(-4, -7, 8, 2);
    ctx.fillStyle = ghost.over ? palette.green : ghost.spark ? "#fff0a0" : ghost.dash ? palette.cyan : palette.gold;
    ctx.fillRect(-3, -16, 6, 5);
    ctx.restore();
    if (replayState.kind !== "pace") {
      drawReplayTag(ghost.x, ghost.y - 31, replayState.label, replayActionColor(replayState.kind), 0.72 * settings.ghostOpacity);
    }
  }

  function replayActionColor(kind) {
    if (kind === "over" || kind === "overDash") return palette.green;
    if (kind === "spark" || kind === "prismSpark") return "#fff0a0";
    return palette.cyan;
  }

  function replayActionFamily(kind) {
    if (kind === "spark" || kind === "prismSpark") return "spark";
    if (kind === "over") return "over";
    return "dash";
  }

  function drawReplayTag(x, y, label, color, alpha) {
    const safeX = Math.max(28, Math.min(W - 28, x));
    const safeY = Math.max(13, Math.min(H - 13, y));
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.font = "700 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const width = Math.max(32, Math.min(86, ctx.measureText(label).width + 14));
    ctx.fillStyle = CANVAS_PANEL_BG;
    roundRect(ctx, safeX - width / 2, safeY - 9, width, 18, 5);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    roundRect(ctx, safeX - width / 2 + 0.5, safeY - 8.5, width - 1, 17, 5);
    ctx.stroke();
    ctx.fillStyle = CANVAS_PANEL_INK;
    ctx.fillText(label, safeX, safeY);
    ctx.restore();
  }

  function drawReplayActionMarker(marker, alpha, showLabel) {
    const color = replayActionColor(marker.kind);
    const ring = marker.kind === "over" || marker.kind === "overDash" || marker.kind === "prismSpark";
    const diamond = marker.kind === "spark" || marker.kind === "prismSpark";
    const chevron = marker.kind === "dash" || marker.kind === "overDash";
    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.globalAlpha = 0.72 * alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.6;
    if (ring) {
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (diamond) {
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
    }
    if (chevron) {
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.lineTo(2, 0);
      ctx.lineTo(-5, 5);
      ctx.moveTo(1, -5);
      ctx.lineTo(8, 0);
      ctx.lineTo(1, 5);
      ctx.stroke();
    }
    ctx.restore();
    if (showLabel) drawReplayTag(marker.x, marker.y - 17, marker.label, color, 0.66 * alpha);
  }

  function replayActionMarkersFor(path) {
    return replayActionMarkersData(path, {
      maxMarkers: settings.lowPerformance ? 6 : settings.calmEffects ? 8 : 10,
      minPointGap: settings.lowPerformance ? 5 : 3
    });
  }

  function pathIndexAtTime(path, elapsed, best) {
    if (path[0] && typeof path[0].t === "number") {
      if (elapsed <= path[0].t) return 0;
      for (let i = 1; i < path.length; i += 1) {
        const current = Number(path[i].t);
        const previous = Number(path[i - 1].t);
        if (!Number.isFinite(current) || !Number.isFinite(previous)) break;
        if (elapsed <= current) {
          const span = Math.max(0.001, current - previous);
          return i - 1 + Math.max(0, Math.min(1, (elapsed - previous) / span));
        }
      }
      return path.length - 1;
    }
    const duration = best > 0 ? best : Math.max(PATH_SAMPLE_INTERVAL, (path.length - 1) * PATH_SAMPLE_INTERVAL);
    return Math.max(0, Math.min(path.length - 1, (elapsed / duration) * (path.length - 1)));
  }

  function pointOnPath(path, rawIndex) {
    const lower = Math.floor(rawIndex);
    const upper = Math.min(path.length - 1, lower + 1);
    const a = path[lower];
    const b = path[upper];
    if (!a || !b) return a || null;
    const t = rawIndex - lower;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      dash: a.dash || b.dash,
      spark: a.spark || b.spark,
      over: a.over || b.over
    };
  }

  function fitText(text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let trimmed = text;
    while (trimmed.length > 3 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    return `${trimmed}...`;
  }

  function isCompactCanvas() {
    return canvas.clientWidth <= 760 || window.innerWidth <= 760;
  }

  function isPortraitViewport() {
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    return viewportWidth <= 760 && viewportHeight > viewportWidth;
  }

  function drawChapterTransition(time) {
    if (chapterTransitionTimer <= 0 || !started || won) return;
    const chapter = CHAPTER_EXPERIENCE[chapterTransitionChapter] || CHAPTER_EXPERIENCE[0];
    const previousChapter = chapterTransitionFromChapter >= 0
      ? CHAPTER_EXPERIENCE[chapterTransitionFromChapter] || null
      : null;
    const duration = prefersReducedMotion
      ? previousChapter ? 1.2 : 0.9
      : CHAPTER_TRANSITION_TIME;
    const progress = 1 - chapterTransitionTimer / duration;
    const alpha = Math.max(0, Math.min(1, progress * 10, (1 - progress) * 7));
    const atmosphere = roomAtmosphere();
    const compact = isCompactCanvas();
    const centerY = compact ? H * 0.39 : H * 0.42;
    const drift = prefersReducedMotion ? 0 : (1 - progress) * 14;
    ctx.save();
    ctx.globalAlpha = alpha * 0.34;
    ctx.fillStyle = atmosphere.top;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = alpha * 0.52;
    const band = ctx.createLinearGradient(0, centerY - 68, 0, centerY + 68);
    band.addColorStop(0, "rgba(20, 29, 43, 0)");
    band.addColorStop(0.28, "rgba(20, 29, 43, 0.72)");
    band.addColorStop(0.72, "rgba(20, 29, 43, 0.72)");
    band.addColorStop(1, "rgba(20, 29, 43, 0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, centerY - 68, W, 136);
    const lineWidth = compact ? 230 : 310;
    const line = ctx.createLinearGradient(W / 2 - lineWidth / 2, 0, W / 2 + lineWidth / 2, 0);
    line.addColorStop(0, `${atmosphere.rim}00`);
    line.addColorStop(0.5, `${atmosphere.rim}d8`);
    line.addColorStop(1, `${atmosphere.rim}00`);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = line;
    ctx.fillRect(W / 2 - lineWidth / 2, centerY - 39, lineWidth, 1.5);
    const previousAlpha = previousChapter
      ? alpha * Math.max(0, Math.min(1, (0.58 - progress) * 7))
      : 0;
    const nextAlpha = previousChapter
      ? alpha * Math.max(0, Math.min(1, (progress - 0.34) * 7))
      : alpha;
    if (previousAlpha > 0.01) {
      drawChapterTransitionCopy({
        title: `${previousChapter.title} · 已越`,
        detail: previousChapter.resolve,
        focus: chapterTransitionResultText(chapterTransitionFromResult),
        alpha: previousAlpha,
        centerY,
        drift: -drift * 0.35,
        compact,
        atmosphere
      });
    }
    if (nextAlpha > 0.01) {
      drawChapterTransitionCopy({
        title: chapter.title,
        detail: chapter.vow,
        focus: chapter.focus,
        alpha: nextAlpha,
        centerY,
        drift,
        compact,
        atmosphere
      });
    }
    ctx.restore();
  }

  function drawChapterTransitionCopy({ title, detail, focus, alpha, centerY, drift, compact, atmosphere }) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(248, 247, 239, 0.96)";
    ctx.font = `700 ${compact ? 21 : 25}px system-ui, sans-serif`;
    ctx.fillText(title, W / 2, centerY - 12 + drift);
    ctx.fillStyle = "rgba(240, 245, 239, 0.82)";
    ctx.font = `600 ${compact ? 11 : 12}px system-ui, sans-serif`;
    ctx.fillText(detail, W / 2, centerY + 17 + drift * 0.5);
    ctx.fillStyle = `${atmosphere.rim}d8`;
    ctx.font = `700 ${compact ? 9 : 10}px system-ui, sans-serif`;
    ctx.letterSpacing = "0.12em";
    ctx.fillText(fitText(focus, compact ? 260 : 360), W / 2, centerY + 39);
    ctx.restore();
  }

  function drawSummitReveal(time) {
    if (summitRevealTimer <= 0 || !won) return;
    const duration = prefersReducedMotion ? 1.35 : SUMMIT_REVEAL_TIME;
    const progress = 1 - summitRevealTimer / duration;
    const reveal = Math.max(0, Math.min(1, progress * 2.8));
    const goal = room.entities.goal;
    const gx = goal?.x || W * 0.72;
    const gy = goal?.y || H * 0.24;
    const compact = isCompactCanvas();
    ctx.save();
    const glow = ctx.createRadialGradient(gx, gy, 12, gx, gy, 190 + progress * 90);
    glow.addColorStop(0, `rgba(255, 232, 156, ${0.2 + reveal * 0.24})`);
    glow.addColorStop(0.4, `rgba(174, 225, 215, ${0.08 + reveal * 0.08})`);
    glow.addColorStop(1, "rgba(174, 225, 215, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    if (!prefersReducedMotion) {
      ctx.globalAlpha = (1 - progress) * 0.5;
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(gx, gy, 28 + progress * (70 + i * 34), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const textAlpha = Math.max(0, Math.min(1, (progress - 0.18) * 4.2, (1 - progress) * 8));
    ctx.globalAlpha = textAlpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(18, 32, 42, 0.35)";
    ctx.shadowBlur = performanceShadowBlur(8);
    ctx.fillStyle = "rgba(250, 248, 236, 0.97)";
    ctx.font = `700 ${compact ? 22 : 27}px system-ui, sans-serif`;
    ctx.fillText("你抵达了星顶", W / 2, H * 0.43);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(240, 246, 238, 0.82)";
    ctx.font = `600 ${compact ? 11 : 12}px system-ui, sans-serif`;
    ctx.fillText("山风停了一瞬。", W / 2, H * 0.43 + 33);
    ctx.fillStyle = `${roomAtmosphere().rim}e0`;
    ctx.font = `700 ${compact ? 9 : 10}px system-ui, sans-serif`;
    ctx.fillText(fitText(summitChapterResultText(summitChapterResult), compact ? 300 : 380), W / 2, H * 0.43 + 55);
    ctx.restore();
    void time;
  }

  function drawRoomIntro(time) {
    void time;
    if (roomIntroTimer <= 0) return;
    if (chapterTransitionTimer > 0) return;
    if (!started || (overlay && !overlay.classList.contains("hidden"))) return;
    if (gameTipVisible("death")) return;
    const t = roomIntroTimer / ROOM_INTRO_TIME;
    const introAlpha = Math.min(1, t * 2.4);
    const introTarget = ROOM_TARGETS[roomIndex] || 0;
    const trainingActive = Boolean(activeDrill || activeChallenge || activeRouteContract || activeFeelFixture);
    const introCompact = isCompactCanvas();
    const width = introCompact ? 250 : 218;
    const height = introCompact ? 40 : 36;
    const x = W / 2 - width / 2;
    const y = introCompact ? 78 : 70;
    ctx.save();
    ctx.globalAlpha = introAlpha * 0.9;
    ctx.fillStyle = "rgba(224, 234, 225, 0.72)";
    roundRect(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(74, 108, 104, 0.24)";
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 10);
    ctx.stroke();
    ctx.globalAlpha = introAlpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(37, 59, 67, 0.96)";
    ctx.font = `700 ${introCompact ? 13 : 12}px system-ui, sans-serif`;
    ctx.fillText(`R${roomIndex + 1} ${ROOM_NAMES[roomIndex] || "Summit"}`, W / 2, y + 13);
    ctx.fillStyle = "rgba(50, 75, 80, 0.76)";
    ctx.font = `600 ${introCompact ? 10.5 : 10}px system-ui, sans-serif`;
    const subline = trainingActive
      ? `${ROOM_CHAPTER_LABELS[roomIndex] || "山巅"} · 目标 ${formatTime(introTarget)}`
      : ROOM_WHISPERS[roomIndex] || "继续向上。";
    ctx.fillText(subline, W / 2, y + 27);
    ctx.restore();
  }

  function masterySummary() {
    const counts = { S: 0, A: 0, B: 0, C: 0 };
    bestRoomTimes.forEach((best, index) => {
      const grade = splitGrade(best, ROOM_TARGETS[index]);
      if (counts[grade] !== undefined) counts[grade] += 1;
    });
    const cleanRooms = roomFocus.filter((entry) => entry && entry.clean > 0).length;
    const cleanTotal = roomFocus.reduce((sum, entry) => sum + (entry?.clean || 0), 0);
    const mistakes = deathCount > 0 ? ` / 失误 ${deathReasonSummary()}` : "";
    return `S ${counts.S}/${maps.length} / A ${counts.A} / 无失误 ${cleanRooms}/${maps.length} (${cleanTotal}) / ${drillSummary()} / Flow Best ${Math.floor(bestFlow)}${mistakes}${focusSummary()}`;
  }

  function largestSplitLossRoom() {
    let best = { index: -1, loss: -Infinity };
    maps.forEach((_, index) => {
      const loss = roomSplitLoss(index);
      if (loss === null) return;
      if (loss > best.loss) best = { index, loss };
    });
    return best.index >= 0 ? best : null;
  }

  function weakestRoomSummary() {
    const focus = strongestFocusRoom();
    if (focus) {
      return `薄弱 R${focus.index + 1} ${deathReasonLabel(focus.reason)} ${focus.score}`;
    }
    const loss = largestSplitLossRoom();
    if (loss && loss.loss > 0) return `薄弱 R${loss.index + 1} 慢 ${formatDelta(loss.loss)}`;
    return "薄弱 无";
  }

  function splitLossSummary() {
    const loss = largestSplitLossRoom();
    if (!loss) return "分段损失 无";
    if (loss.loss <= 0) return "全部达标";
    return `分段损失 R${loss.index + 1} ${formatDelta(loss.loss)}：${roomPurposeLabel(loss.index)}`;
  }

  function currentRunReviewData() {
    return postRunReviewData({
      roomTimes: runRoomTimes,
      roomMistakes,
      targets: ROOM_TARGETS
    });
  }

  function postRunTrainingAdvice(plan) {
    const recommendation = plan?.recommendation;
    if (!recommendation) {
      const fallback = recommendedPracticeRoom();
      return roomTrainingAdvice(fallback);
    }
    const index = recommendation.index;
    if (recommendation.reason === "mistakes") {
      const entry = roomFocus[index] || createRoomFocusEntry();
      return `R${index + 1} ${ROOM_NAMES[index] || "Summit"}：本轮失误 ${recommendation.mistakes}；${roomCoachHint(index, leadingRoomReason(entry))}`;
    }
    return `R${index + 1} ${ROOM_NAMES[index] || "Summit"}：本轮慢 ${formatDelta(recommendation.loss)}；${roomRouteLine(index, 1)}`;
  }

  function runChapterSplits() {
    return runChapterSplitsData({
      chapterTitles: CHAPTER_EXPERIENCE.map((chapter) => chapter.title),
      chapterIndexes: maps.map((_, index) => chapterIndexForRoom(index)),
      roomLabels: ROOM_CHAPTER_LABELS,
      roomTimes: runRoomTimes,
      roomMistakes
    });
  }

  function runChapterReview() {
    const review = runChapterReviewData({
      chapters: runChapterSplits(),
      totalRooms: maps.length
    });
    if (!review.chapters.length) {
      return {
        value: "等待完整路线",
        detail: "从 R1 开始后，这里会比较四幕用时与失误。",
        summary: "本轮分幕 无"
      };
    }
    const detail = review.chapters
      .map((chapter) => `${chapter.label} ${formatTime(chapter.seconds)} / 失 ${chapter.mistakes}`)
      .join(" · ");
    return {
      value: review.complete ? `最慢 ${review.slowest.label} · ${formatTime(review.slowest.seconds)}` : `已记录 ${review.visitedRooms}/${review.totalRooms} 房`,
      detail,
      summary: review.complete ? `本轮最慢 ${review.slowest.label} ${formatTime(review.slowest.seconds)}` : `本轮分幕 ${review.visitedRooms}/${review.totalRooms} 房`
    };
  }

  function buildRunReport() {
    const build = document.querySelector('meta[name="build-version"]')?.content || "dev";
    const chapters = runChapterSplits();
    const visitedRooms = runRoomTimes.filter((seconds) => seconds > 0).length;
    const complete = won && visitedRooms === maps.length;
    const text = runReportTextData({
      build,
      complete,
      visitedRooms,
      totalRooms: maps.length,
      totalTime: formatTime(runTime),
      mistakes: deathCount,
      flow: flowPeak,
      assistUsed: runUsedAssist,
      chapters: chapters.map((chapter) => ({
        ...chapter,
        time: chapter.visited ? formatTime(chapter.seconds) : "—"
      })),
      rooms: maps.map((_, index) => ({
        index,
        label: ROOM_NAMES[index] || "",
        time: runRoomTimes[index] > 0 ? formatTime(runRoomTimes[index]) : "—",
        mistakes: roomMistakes[index] || 0,
        visited: runRoomTimes[index] > 0
      }))
    });
    window.__summitLastRunReport = text;
    return text;
  }

  async function copyRunReport(button) {
    const text = buildRunReport();
    const build = document.querySelector('meta[name="build-version"]')?.content || "dev";
    const copied = await copyTextWithDownloadFallback(text, `summit-spark-run-${build}.txt`);
    const verb = copied ? "已复制" : "已下载";
    if (button) {
      const original = button.dataset.originalLabel || button.textContent || "复制本轮";
      button.dataset.originalLabel = original;
      button.textContent = `本轮${verb}`;
      window.setTimeout(() => {
        if (button.isConnected) button.textContent = original;
      }, 1800);
    }
    setGameStatus(`本轮报告${verb}，可直接贴到试玩反馈`);
    playSound("ui", 0.68);
  }

  function practiceReportText() {
    const cleanRooms = roomFocus.filter((entry) => entry && entry.clean > 0).length;
    const next = recommendedPracticeRoom();
    return `无失误 ${cleanRooms}/${maps.length} / ${chapterSummary()} / ${challengeSummary()} / ${drillSummary()} / ${contractSummary()} / ${routeContractSummaryText()} / 路线图 ${masteryRoadmapSummary()} / ${practiceRouteSummary()} / 优先 ${practiceLedgerSummary()} / ${weakestRoomSummary()} / ${splitLossSummary()} / 建议 ${roomTrainingAdvice(next)}`;
  }

  function chapterSummary() {
    const data = chapterCompletionData();
    return `章节 ${chapterGrade(data.percent)} ${data.percent}%`;
  }

  function challengeSummary() {
    const items = challengeBoardItems();
    const wins = items.filter((item) => item.done).length;
    const next = items.find((item) => !item.done);
    return next ? `挑战 ${wins}/${items.length} ${next.label} ${next.progress}%` : `挑战 ${wins}/${items.length} 全完成`;
  }

  function drillSummary() {
    const starts = roomFocus.reduce((sum, entry) => sum + (entry?.drills || 0), 0);
    const clears = roomFocus.reduce((sum, entry) => sum + (entry?.drillClears || 0), 0);
    const clean = roomFocus.reduce((sum, entry) => sum + (entry?.drillClean || 0), 0);
    return starts > 0 ? `Drill ${clean}/${clears}/${starts}` : "Drill 0";
  }

  function contractSummary() {
    const totals = roomFocus.reduce((sum, entry) => {
      sum.cleanWins += entry?.cleanWins || 0;
      sum.cleanDrills += entry?.cleanDrills || 0;
      sum.paceWins += entry?.paceWins || 0;
      sum.paceDrills += entry?.paceDrills || 0;
      sum.styleWins += entry?.styleWins || 0;
      sum.styleDrills += entry?.styleDrills || 0;
      sum.expertWins += entry?.expertWins || 0;
      sum.expertDrills += entry?.expertDrills || 0;
      return sum;
    }, { cleanWins: 0, cleanDrills: 0, paceWins: 0, paceDrills: 0, styleWins: 0, styleDrills: 0, expertWins: 0, expertDrills: 0 });
    return `合约 C ${totals.cleanWins}/${totals.cleanDrills} · P ${totals.paceWins}/${totals.paceDrills} · S ${totals.styleWins}/${totals.styleDrills} · X ${totals.expertWins}/${totals.expertDrills}`;
  }

  function practiceRouteSummary() {
    return practiceQueueItems()
      .map((item) => `${item.label[0]} R${item.index + 1}`)
      .join(" → ");
  }

  function reviewCardHtml(label, value, detail, priority = "secondary") {
    const resolved = priority === "primary" ? "primary" : "secondary";
    return `<article class="review-card ${resolved}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(detail)}</p></article>`;
  }

  function reviewRoadmapHtml() {
    const rows = masteryRoadmapRows(4);
    return `<div class="review-roadmap">`
      + `<div class="roadmap-head"><span>掌握路线图</span><em>按缺口排序 · 点一行开练</em></div>`
      + rows.map((row, rank) => `<button class="roadmap-row ${escapeHtml(row.mode)}" type="button" data-finish-drill="${row.index}" data-finish-mode="${escapeHtml(row.mode)}" aria-label="${escapeHtml(row.next)} ${escapeHtml(row.title)}">`
        + `<span class="roadmap-rank">${String(rank + 1).padStart(2, "0")}</span>`
        + `<span class="roadmap-main"><strong>${escapeHtml(row.title)}</strong><em>${escapeHtml(row.objective)}</em></span>`
        + `<span class="roadmap-state"><b>${escapeHtml(row.level)} ${row.score}</b><em>${escapeHtml(row.gap)}</em>${masteryContractPillsHtml(row.index, row.mode)}</span>`
        + `<span class="roadmap-action">${escapeHtml(row.next)}</span>`
        + `</button>`).join("")
      + `</div>`;
  }

  function summitReviewCardsHtml() {
    const runPlan = currentRunReviewData();
    const next = runPlan?.recommendation?.index ?? recommendedPracticeRoom();
    const nextMode = runPlan?.recommendation?.mode || resolveDrillMode(next);
    const styleIndex = stylePracticeRoom();
    const loss = runPlan?.largestLoss || null;
    const focus = strongestFocusRoom();
    const chapter = chapterCompletionData();
    const chapterText = `${chapterGrade(chapter.percent)} · ${chapter.percent}%`;
    const challengeItems = challengeBoardItems();
    const challengeWins = challengeItems.filter((item) => item.done).length;
    const nextChallenge = challengeItems.find((item) => !item.done) || challengeItems[challengeItems.length - 1];
    const challengeReview = activeChallengeReview();
    const runReview = runChapterReview();
    const challengeReviewCard = challengeReview ? reviewCardHtml("本轮挑战", challengeReview.value, challengeReview.detail, "primary") : "";
    const routeContractCard = reviewCardHtml("航线合同", routeContractSummaryText(), lastRouteContractResult?.detail || "三步连练会自动推进下一 Drill。", lastRouteContractResult ? "primary" : "secondary");
    const splitValue = loss && loss.loss > 0 ? `R${loss.index + 1} ${formatDelta(loss.loss)}` : "全部达标";
    const splitDetail = loss && loss.loss > 0
      ? `${formatTime(loss.seconds)} / 目标 ${formatTime(loss.target)} · ${roomRouteLine(loss.index, 1)}`
      : "本轮已达到所有已访问房间的目标时间。";
    const focusValue = focus ? `R${focus.index + 1} ${deathReasonLabel(focus.reason)} ${focus.score}` : "暂无高压点";
    const focusDetail = focus ? roomCoachHint(focus.index, focus.reason) : "死亡结构稳定后，优先追最慢 split。";
    const lossButton = loss && loss.loss > 0
      ? `<button class="review-button" type="button" data-finish-drill="${loss.index}" data-finish-mode="pace">最慢房 Pace</button>`
      : "";
    const styleButton = `<button class="review-button" type="button" data-finish-drill="${styleIndex}" data-finish-mode="style">类型 Style</button>`;
    const primaryCards = reviewCardHtml("下一 Drill", `R${next + 1} ${drillModeLabel(nextMode)}`, postRunTrainingAdvice(runPlan), "primary")
      + reviewCardHtml("章节完成度", chapterText, `Clean ${chapter.clean}/${maps.length} · S ${chapter.pace}/${maps.length} · X ${chapter.expert}/${maps.length}`, "primary")
      + (challengeReviewCard || reviewCardHtml("长期挑战", `${challengeWins}/${LONG_TERM_CHALLENGES.length}`, nextChallenge ? `${nextChallenge.label}：${nextChallenge.detail}` : "挑战已全部完成", "primary"))
      + (lastRouteContractResult ? routeContractCard : "");
    const extraCards = reviewCardHtml("本轮分幕", runReview.value, runReview.detail)
      + reviewCardHtml("本轮最大损失", splitValue, splitDetail)
      + reviewCardHtml("薄弱原因", focusValue, focusDetail)
      + reviewCardHtml("类型挑战", `R${styleIndex + 1} ${styleTrialLabel(styleIndex)}`, styleTrialReviewText(styleIndex))
      + reviewCardHtml("训练航线", practiceRouteSummary(), "先稳无失误，再追目标时间，最后冲高手线。")
      + (lastRouteContractResult ? "" : routeContractCard);
    return `<div class="review-grid review-grid-primary">${primaryCards}</div>`
      + `<p class="review-advice">${escapeHtml(postRunTrainingAdvice(runPlan))}</p>`
      + `<div class="review-actions"><button class="review-button primary-review" type="button" data-finish-drill="${next}" data-finish-mode="${nextMode}">下一 ${drillModeLabel(nextMode)}</button>${styleButton}${lossButton}</div>`
      + `<details class="review-more"><summary aria-expanded="false"><span>更多复盘</span><span class="review-more-chevron" aria-hidden="true">›</span></summary><div class="review-grid review-grid-extra">${extraCards}</div><div class="review-run-export"><button class="review-button" type="button" data-copy-run-report>复制本轮</button><small>仅含本轮时间、失误、Flow 与辅助状态；不会上传。</small></div></details>`
      + `<details class="review-more review-roadmap-panel"><summary aria-expanded="false"><span>掌握路线图</span><span class="review-more-chevron" aria-hidden="true">›</span></summary>${reviewRoadmapHtml()}</details>`;
  }

  function bindFinishReviewActions() {
    overlay.querySelectorAll("[data-finish-drill]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = Number(button.getAttribute("data-finish-drill"));
        const mode = button.getAttribute("data-finish-mode") || "auto";
        if (Number.isInteger(target) && target >= 0 && target < maps.length) {
          startRoomDrill(target, mode);
        }
      });
    });
    const copyButton = overlay.querySelector("[data-copy-run-report]");
    copyButton?.addEventListener("click", () => {
      copyRunReport(copyButton).catch(() => {
        setGameStatus("本轮报告复制失败，请重试");
      });
    });
  }

  function drawSplitPopup(time) {
    if (splitPopupTimer <= 0 || !splitPopupText) return;
    const t = splitPopupTimer / SPLIT_POPUP_TIME;
    const y = 132 - (1 - t) * 12;
    const pulse = 1 + Math.sin(time * 18) * 0.018;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.7);
    ctx.translate(W / 2, y);
    ctx.scale(pulse, pulse);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.shadowColor = splitPopupAhead ? palette.gold : palette.hot;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 6 : 13);
    ctx.fillStyle = splitPopupAhead ? palette.gold : "#ff99aa";
    ctx.fillText(splitPopupText, 0, 0);
    ctx.restore();
  }


  function drawFocusPopup(time) {
    if (focusPopupTimer <= 0 || !focusPopupText) return;
    const t = focusPopupTimer / FOCUS_POPUP_TIME;
    const y = 158 - (1 - t) * 10;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.45);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.shadowColor = palette.hot;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 5 : 11);
    ctx.fillStyle = "#ff99aa";
    ctx.fillText(fitText(focusPopupText, isCompactCanvas() ? 680 : 560), W / 2, y + Math.sin(time * 16) * 1.2);
    if (focusPopupDetail) {
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.fillStyle = "rgba(248,251,255,0.72)";
      ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 3 : 7);
      ctx.fillText(fitText(focusPopupDetail, isCompactCanvas() ? 690 : 600), W / 2, y + 18);
    }
    ctx.restore();
  }

  function drawDrillHud(time) {
    if (!activeDrill || activeDrill.room !== roomIndex || won) return;
    const current = roomMistakes[roomIndex] || 0;
    const limit = activeRoomTimeLimit(roomIndex);
    const mode = drillModeLabel(activeDrill.mode);
    const timeLabel = limit > 0 ? ` ${formatTime(limit)}` : "";
    const text = `R${roomIndex + 1} · ${mode}${timeLabel}${current ? ` · 失误 ${current}` : ""}`;
    const hudObjective = activeDrill.mode === "clean" ? routeLineCore(roomIndex, 0) : activeDrill.objective;
    const detail = [hudObjective].filter(Boolean).join(" · ");
    const y = 70;
    void time;
    ctx.save();
    ctx.font = "700 11px system-ui, sans-serif";
    const label = fitText(text, 210);
    const width = Math.min(430, Math.max(250, ctx.measureText(label).width + ctx.measureText(detail).width + 46));
    const height = 32;
    const x = W / 2 - width / 2;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "rgba(39,61,73,0.88)";
    roundRect(ctx, x, y - height / 2, width, height, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(213,231,231,0.18)";
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y - height / 2 + 0.5, width - 1, height - 1, 10);
    ctx.stroke();
    if (limit > 0) {
      const progress = Math.max(0, Math.min(1, roomTime / limit));
      const over = roomTime > limit;
      ctx.fillStyle = over ? "rgba(220,142,132,0.82)" : "rgba(132,193,181,0.82)";
      roundRect(ctx, x + 10, y + height / 2 - 4, (width - 20) * progress, 2, 1);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 0;
    ctx.fillStyle = current ? "#f0c4b8" : "#eef6f4";
    ctx.fillText(label, x + 13, y - 1);
    ctx.font = "500 10px system-ui, sans-serif";
    ctx.fillStyle = "rgba(222,236,234,0.68)";
    ctx.textAlign = "right";
    ctx.fillText(fitText(detail, 250), x + width - 13, y - 1);
    ctx.restore();
  }

  function drawActiveChallengeHud(time) {
    if (!activeChallenge || activeDrill || won || player.deadTimer > 0) return;
    if (roomIntroTimer > 0.25 || gameTipVisible("death")) return;
    const state = activeChallengeState();
    if (!state) return;
    const compact = isCompactCanvas();
    const color = state.failed ? palette.hot : state.done ? palette.green : state.kind === "flow" ? palette.gold : palette.cyan;
    const width = compact ? 360 : 340;
    const height = 52;
    const x = compact ? W - width - 16 : 18;
    let y = timingArmed ? H - 82 : H - 132;
    if (compact && routeCueActive()) y = H - 210;
    void time;
    const title = fitText(`挑战 · ${state.label} · ${state.status}`, width - 28);
    const detail = fitText(state.detail, width - 28);
    const progress = Math.max(0, Math.min(1, state.progress / 100));

    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = CANVAS_PANEL_BG;
    roundRect(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.strokeStyle = CANVAS_PANEL_STROKE;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 10);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.fillStyle = CANVAS_PANEL_INK;
    ctx.fillText(title, x + 14, y + 15);
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.fillStyle = CANVAS_PANEL_MUTED;
    ctx.fillText(detail, x + 14, y + 33);
    ctx.globalAlpha = 0.58;
    ctx.fillStyle = "rgba(46,68,76,0.14)";
    roundRect(ctx, x + 14, y + height - 8, width - 28, 3, 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    roundRect(ctx, x + 14, y + height - 8, (width - 28) * progress, 3, 2);
    ctx.fill();
    ctx.restore();
  }

  function flowTierLabel(score) {
    if (score >= 260) return "AURORA";
    if (score >= 170) return "SURGE";
    if (score >= 80) return "SPARK";
    if (score > 0) return "FLOW";
    return "CALM";
  }

  function flowTierColor(score) {
    if (score >= 260) return "#fff0a0";
    if (score >= 170) return palette.gold;
    if (score >= 80) return palette.green;
    if (score > 0) return palette.cyan;
    return "rgba(248,251,255,0.72)";
  }

  function activeRoomTimeLimit(index = roomIndex) {
    const target = ROOM_TARGETS[index] || 0;
    if (!activeDrill || activeDrill.room !== index) return target;
    if (activeDrill.mode === "pace" || activeDrill.mode === "expert") return activeDrill.target || target;
    if (activeDrill.mode === "style") return styleTrialTimeLimit(index) || target;
    return target;
  }

  function paceFeedbackActive() {
    if (activeDrill && activeDrill.room === roomIndex) {
      return ["pace", "style", "expert"].includes(activeDrill.mode);
    }
    if (activeRouteContract || activeFeelFixture) return true;
    return Boolean(activeChallenge && ["pace", "flow"].includes(activeChallenge.kind));
  }

  function drawFlowAtmosphere(time) {
    if (player.deadTimer > 0 || flowScore < 60) return;
    const intensity = Math.max(0, Math.min(1, flowScore / 280));
    const color = flowTierColor(flowScore);
    const pulse = 0.5 + Math.sin(time * 5.5) * 0.5;
    ctx.save();
    ctx.globalAlpha = (settings.calmEffects ? 0.06 : 0.1) + intensity * 0.14;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + intensity * 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 4 : 14);
    ctx.strokeRect(5.5, 5.5, W - 11, H - 11);
    ctx.globalAlpha = (0.08 + intensity * 0.16) * (0.72 + pulse * 0.28);
    ctx.lineWidth = 4 + intensity * 4;
    ctx.beginPath();
    ctx.moveTo(36, 18);
    ctx.lineTo(W - 36, 18);
    ctx.moveTo(36, H - 18);
    ctx.lineTo(W - 36, H - 18);
    ctx.stroke();
    ctx.restore();
  }

  function drawPaceRibbon(time) {
    if (!started || won || !timingArmed || player.deadTimer > 0 || !paceFeedbackActive()) return;
    const limit = activeRoomTimeLimit(roomIndex);
    if (!(limit > 0)) return;
    const progress = Math.max(0, Math.min(1, roomTime / limit));
    const over = roomTime > limit;
    const delta = roomTime - limit;
    const active = Boolean(activeDrill && activeDrill.room === roomIndex);
    const width = active ? 168 : 146;
    const height = 20;
    const x = W / 2 - width / 2;
    const y = H - height - 8;
    const color = over ? palette.hot : delta <= -1.5 ? palette.green : palette.gold;
    const alpha = active || over || roomIntroTimer > 0 ? 0.94 : 0.72;
    const trackX = x + 9;
    const trackY = y + height - 5;
    const trackWidth = width - 18;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(18,36,47,0.24)";
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 0 : 8);
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = "rgba(38,60,73,0.88)";
    roundRect(ctx, x, y, width, height, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = over ? "rgba(255,101,125,0.46)" : "rgba(226,239,234,0.22)";
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 6.5);
    ctx.stroke();

    ctx.fillStyle = "rgba(215,229,228,0.14)";
    roundRect(ctx, trackX, trackY, trackWidth, 2, 1);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, trackX, trackY, trackWidth * progress, 2, 1);
    ctx.fill();
    if (over) {
      const warning = 0.5 + Math.sin(time * 9) * 0.5;
      ctx.globalAlpha = 0.08 + warning * 0.05;
      ctx.fillStyle = palette.hot;
      roundRect(ctx, x + 1, y + 1, width - 2, height - 2, 6);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.font = "650 9px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(241,247,244,0.9)";
    const label = active ? drillModeLabel(activeDrill.mode) : "Pace";
    ctx.fillText(label, x + 10, y + 8);
    ctx.textAlign = "right";
    ctx.fillStyle = color;
    ctx.font = "700 9px system-ui, sans-serif";
    ctx.fillText(formatDelta(delta), x + width - 10, y + 8);
    ctx.restore();
  }

  function drawTimingGateCue(time) {
    void time;
  }

  function roomAtmosphere() {
    return ROOM_ATMOSPHERES[roomIndex % ROOM_ATMOSPHERES.length] || ROOM_ATMOSPHERES[0];
  }

  function drawVelocityWake(time) {
    if (player.deadTimer > 0 || prefersReducedMotion) return;
    const speed = Math.hypot(player.vx, player.vy);
    const dashPulse = Math.max(visualRatio("dash", 0.24), player.dashTimer / DASH_TIME);
    const sparkPulse = visualRatio("spark", 0.28);
    const springPulse = visualRatio("spring", 0.24);
    const over = player.overdrive > 0 ? 0.5 : 0;
    const boostedMotion = dashPulse > 0.04 || sparkPulse > 0.04 || springPulse > 0.04 || over > 0 || Math.abs(player.vx) > MOVE_SPEED * 1.05;
    if (!boostedMotion) return;
    const intensity = Math.max(0, Math.min(1, (speed - 260) / 420 + dashPulse * 0.45 + sparkPulse * 0.35 + over));
    if (intensity <= 0.04) return;
    const dx = speed > 24 ? player.vx / speed : player.facing || 1;
    const dy = speed > 24 ? player.vy / speed : 0;
    const nx = -dy;
    const ny = dx;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const count = settings.lowPerformance ? 2 : settings.calmEffects ? 3 : 5;
    const color = player.overdrive > 0 ? palette.gold : sparkPulse > 0.05 ? "#fff0a0" : palette.cyan;

    ctx.save();
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 5 : 12);
    for (let i = 0; i < count; i += 1) {
      const phase = time * 12 + i * 1.7;
      const lane = (i - (count - 1) / 2) * 6 + Math.sin(phase) * 2;
      const back = 18 + i * 10 + intensity * 12;
      const length = 18 + i * 6 + intensity * 22;
      const x = cx - dx * back + nx * lane;
      const y = cy - dy * back + ny * lane;
      ctx.globalAlpha = (0.1 + intensity * 0.23) * (1 - i / (count + 1));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2 + intensity * 2 - i * 0.18;
      ctx.beginPath();
      ctx.moveTo(x - dx * length * 0.55, y - dy * length * 0.55);
      ctx.lineTo(x + dx * length * 0.38, y + dy * length * 0.38);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBackground(time) {
    const ambientTime = prefersReducedMotion ? 0 : time;
    const atmosphere = roomAtmosphere();
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, atmosphere.top);
    gradient.addColorStop(0.55, atmosphere.mid);
    gradient.addColorStop(1, atmosphere.low);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    const horizonGlow = ctx.createRadialGradient(W * 0.72, H * 0.66, 18, W * 0.72, H * 0.66, W * 0.58);
    horizonGlow.addColorStop(0, `${atmosphere.rim}24`);
    horizonGlow.addColorStop(0.46, `${atmosphere.haze}12`);
    horizonGlow.addColorStop(1, `${atmosphere.haze}00`);
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.18;
    const starCount = settings.lowPerformance || prefersReducedMotion ? 16 : 28;
    for (let i = 0; i < starCount; i++) {
      const x = (i * 137 + roomIndex * 53) % W;
      const y = (i * 79 + 40) % 210;
      ctx.fillStyle = i % 6 === 0 ? atmosphere.rim : i % 5 === 0 ? atmosphere.haze : "#ecf9ff";
      const size = i % 7 === 0 ? 2 : 1;
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();

    if (!settings.lowPerformance && !prefersReducedMotion) drawSkyRibbons(time, atmosphere);
    drawChapterResonance(ambientTime, atmosphere);

    drawMountainLayer(atmosphere.back, 0.35, 80 + roomIndex * 18, 0.18);
    drawMountainLayer(atmosphere.midPeak, 0.48, 150 + roomIndex * 9, 0.12);
    drawChapterLandmarks(ambientTime, atmosphere);
    drawRoomLandmark(ambientTime, atmosphere);
    drawChapterWeather(ambientTime, atmosphere);
    drawMountainLayer(atmosphere.front, 0.72, 220, 0.08);

    // Let the moon travel across the chapters instead of pinning every exit
    // against the same bright disc. It starts high on the right and drifts to
    // the left as the climb advances, leaving late-room goals a clear focal area.
    const moonChapter = roomIndex < 3 ? 0 : roomIndex < 6 ? 1 : roomIndex < 8 ? 2 : 3;
    const moonTrack = [0.76, 0.58, 0.34, 0.2];
    const moonHeights = [88, 78, 98, 82];
    const chapterRoomOffset = ((roomIndex % 3) - 1) * 14;
    const moonX = W * moonTrack[moonChapter] + chapterRoomOffset;
    const moonY = moonHeights[moonChapter] + Math.sin(ambientTime * 0.3) * 2;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 18, moonX, moonY, 76);
    moonGlow.addColorStop(0, `${atmosphere.moon}2e`);
    moonGlow.addColorStop(1, `${atmosphere.moon}00`);
    ctx.fillStyle = moonGlow;
    ctx.fillRect(moonX - 78, moonY - 78, 156, 156);
    ctx.fillStyle = `${atmosphere.moon}b8`;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `${atmosphere.rim}36`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(23, 31, 47, 0.12)";
    ctx.beginPath();
    ctx.arc(moonX + 10, moonY - 7, 7, 0, Math.PI * 2);
    ctx.arc(moonX - 11, moonY + 10, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSkyRibbons(time, atmosphere) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < 2; i += 1) {
      const y = 68 + i * 34 + Math.sin(time * 0.22 + roomIndex + i) * 8;
      const drift = ((time * (8 + i * 3) + roomIndex * 43) % (W + 260)) - 130;
      ctx.globalAlpha = settings.calmEffects ? 0.035 : 0.055 + i * 0.015;
      ctx.strokeStyle = i === 1 ? atmosphere.rim : atmosphere.haze;
      ctx.lineWidth = 7 - i * 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 2 : 9);
      ctx.beginPath();
      ctx.moveTo(drift - 260, y + 14);
      ctx.bezierCurveTo(drift - 90, y - 28, drift + 160, y + 28, drift + 360, y - 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawChapterResonance(time, atmosphere) {
    const routePulse = activeRouteContract ? 0.35 : 0;
    const challengePulse = activeChallenge ? 0.22 : 0;
    const flowPulse = Math.max(0, Math.min(0.7, flowScore / 380));
    const intensity = Math.max(routePulse, challengePulse, flowPulse);
    if (intensity <= 0.02) return;
    const color = activeRouteContract ? palette.green : flowScore >= 170 ? palette.gold : atmosphere.haze;
    ctx.save();
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 5 : 12);
    const lineCount = settings.lowPerformance ? 2 : 4;
    for (let i = 0; i < lineCount; i += 1) {
      const y = 34 + i * 22 + Math.sin(time * 0.7 + roomIndex + i) * 5;
      const start = ((time * (18 + i * 4) + i * 90 + roomIndex * 37) % (W + 240)) - 120;
      ctx.globalAlpha = (settings.calmEffects ? 0.035 : 0.055) + intensity * (0.035 + i * 0.006);
      ctx.strokeStyle = i % 2 === 0 ? color : atmosphere.rim;
      ctx.lineWidth = 2 + intensity * 2.2;
      ctx.beginPath();
      ctx.moveTo(start, y);
      ctx.bezierCurveTo(start + 80, y - 18, start + 180, y + 22, start + 290, y - 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawChapterLandmarks(time, atmosphere) {
    const act = roomIndex < 3 ? 0 : roomIndex < 6 ? 1 : roomIndex < 8 ? 2 : 3;
    const drift = (roomIndex % 3) * 24;
    ctx.save();
    ctx.globalAlpha = settings.lowPerformance ? (act === 0 ? 0.12 : 0.09) : (act === 0 ? 0.19 : 0.14);
    ctx.strokeStyle = atmosphere.rim;
    ctx.fillStyle = atmosphere.haze;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (act === 0) {
      const gateX = 126 + drift;
      const gateY = 268;
      ctx.fillRect(gateX, gateY - 80, 13, 96);
      ctx.fillRect(gateX + 88, gateY - 80, 13, 96);
      ctx.fillRect(gateX - 8, gateY - 88, 122, 10);
      ctx.globalAlpha *= 0.72;
      ctx.beginPath();
      ctx.moveTo(gateX + 18, gateY - 78);
      ctx.lineTo(gateX + 50, gateY - 48);
      ctx.lineTo(gateX + 82, gateY - 78);
      ctx.stroke();
      ctx.globalAlpha = settings.lowPerformance ? 0.18 : 0.26;
      ctx.fillStyle = atmosphere.rim;
      [gateX + 27, gateX + 75].forEach((lanternX) => {
        ctx.fillRect(lanternX, gateY - 78, 1.5, 9);
        ctx.beginPath();
        ctx.moveTo(lanternX + 0.75, gateY - 70);
        ctx.lineTo(lanternX + 5, gateY - 64);
        ctx.lineTo(lanternX + 0.75, gateY - 58);
        ctx.lineTo(lanternX - 3.5, gateY - 64);
        ctx.closePath();
        ctx.fill();
      });
      ctx.globalAlpha = settings.lowPerformance ? 0.08 : 0.13;
      ctx.fillStyle = atmosphere.haze;
      for (let i = 0; i < 3; i += 1) {
        const cairnX = 690 + i * 48 - drift;
        const cairnY = 300 - i * 9;
        ctx.fillRect(cairnX - 10, cairnY, 20, 5);
        ctx.fillRect(cairnX - 7, cairnY - 7, 14, 5);
        ctx.fillRect(cairnX - 3, cairnY - 12, 6, 3);
      }
    } else if (act === 1) {
      const bridgeY = 258 - (roomIndex - 3) * 7;
      ctx.fillRect(108, bridgeY, 72, 7);
      ctx.fillRect(238, bridgeY - 18, 82, 7);
      ctx.fillRect(390, bridgeY - 6, 58, 7);
      ctx.fillRect(540, bridgeY - 27, 94, 7);
      ctx.strokeStyle = atmosphere.haze;
      ctx.beginPath();
      ctx.moveTo(176, bridgeY + 2);
      ctx.quadraticCurveTo(208, bridgeY + 32, 242, bridgeY - 15);
      ctx.moveTo(316, bridgeY - 15);
      ctx.quadraticCurveTo(350, bridgeY + 28, 394, bridgeY - 3);
      ctx.moveTo(444, bridgeY - 3);
      ctx.quadraticCurveTo(490, bridgeY + 34, 544, bridgeY - 24);
      ctx.stroke();
      [118, 304, 620].forEach((x, index) => {
        ctx.fillRect(x, bridgeY + 6 - index * 8, 9, 94 + index * 10);
      });
    } else if (act === 2) {
      for (let i = 0; i < 4; i += 1) {
        const poleX = 116 + i * 206 + drift * 0.5;
        const poleY = 222 + (i % 2) * 34;
        ctx.fillRect(poleX, poleY, 4, 114);
        ctx.beginPath();
        ctx.moveTo(poleX + 4, poleY + 8);
        ctx.quadraticCurveTo(poleX + 34 + Math.sin(time * 1.4 + i) * 4, poleY + 15, poleX + 58, poleY + 30);
        ctx.lineTo(poleX + 4, poleY + 38);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha *= 0.6;
      for (let i = 0; i < 7; i += 1) {
        const y = 172 + i * 25;
        const x = 40 + ((i * 137 + roomIndex * 31) % 760);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 34 + (i % 3) * 12, y - 4);
        ctx.stroke();
      }
    } else {
      const domeX = 720 - drift;
      const domeY = 284;
      ctx.beginPath();
      ctx.arc(domeX, domeY, 62, Math.PI, 0);
      ctx.lineTo(domeX + 62, domeY + 18);
      ctx.lineTo(domeX - 62, domeY + 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(domeX - 7, domeY - 112, 14, 130);
      ctx.beginPath();
      ctx.moveTo(domeX, domeY - 134);
      ctx.lineTo(domeX + 16, domeY - 108);
      ctx.lineTo(domeX - 16, domeY - 108);
      ctx.closePath();
      ctx.fill();
      const stars = [[118, 154], [184, 122], [250, 166], [326, 110], [392, 148]];
      ctx.strokeStyle = atmosphere.rim;
      ctx.beginPath();
      stars.forEach(([x, y], index) => {
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      stars.forEach(([x, y], index) => ctx.fillRect(x - 2, y - 2, index === 3 ? 5 : 4, index === 3 ? 5 : 4));
    }
    ctx.restore();
  }

  function drawRoomLandmark(time, atmosphere) {
    const landmark = ROOM_LANDMARKS[roomIndex];
    if (!landmark) return;
    const pulse = prefersReducedMotion ? 0 : Math.sin(time * 0.55 + roomIndex) * 0.035;
    const scale = Number(landmark.scale) || 1;
    ctx.save();
    ctx.translate(W * landmark.x, H * landmark.y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = (settings.lowPerformance ? 0.11 : settings.calmEffects ? 0.15 : 0.18) + pulse;
    ctx.strokeStyle = atmosphere.rim;
    ctx.fillStyle = atmosphere.haze;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = atmosphere.haze;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 2 : 7);

    if (landmark.kind === "gate-steps") {
      ctx.beginPath();
      ctx.moveTo(-82, 54);
      ctx.lineTo(-42, 54);
      ctx.lineTo(-42, 34);
      ctx.lineTo(-4, 34);
      ctx.lineTo(-4, 14);
      ctx.lineTo(35, 14);
      ctx.lineTo(35, -8);
      ctx.lineTo(78, -8);
      ctx.stroke();
      ctx.fillRect(48, -80, 6, 72);
      ctx.fillRect(92, -80, 6, 72);
      ctx.fillRect(42, -84, 62, 6);
    } else if (landmark.kind === "relay-bridge") {
      ctx.beginPath();
      ctx.moveTo(-100, 22);
      ctx.quadraticCurveTo(-48, 76, 0, 12);
      ctx.quadraticCurveTo(50, -46, 104, 10);
      ctx.stroke();
      [-100, 0, 104].forEach((x, index) => {
        const y = index === 1 ? 12 : index === 2 ? 10 : 22;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-8, -8, 16, 16);
        ctx.restore();
      });
    } else if (landmark.kind === "mist-springs") {
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(0, 34 - i * 35, 74 - i * 12, 18, 0, Math.PI * 0.08, Math.PI * 0.92);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-58, 52);
      ctx.lineTo(-34, 30);
      ctx.lineTo(-10, 52);
      ctx.lineTo(14, 30);
      ctx.lineTo(38, 52);
      ctx.lineTo(62, 30);
      ctx.stroke();
    } else if (landmark.kind === "triple-link") {
      [-62, 0, 62].forEach((x, index) => {
        ctx.save();
        ctx.translate(x, index === 1 ? -22 : 16);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-18, -18, 36, 36);
        ctx.restore();
      });
      ctx.beginPath();
      ctx.moveTo(-43, 3);
      ctx.lineTo(-18, -15);
      ctx.moveTo(18, -15);
      ctx.lineTo(43, 3);
      ctx.stroke();
    } else if (landmark.kind === "switchback") {
      ctx.beginPath();
      ctx.moveTo(-92, 66);
      ctx.lineTo(72, 66);
      ctx.lineTo(72, 28);
      ctx.lineTo(-52, 28);
      ctx.lineTo(-52, -10);
      ctx.lineTo(52, -10);
      ctx.lineTo(52, -50);
      ctx.lineTo(-18, -50);
      ctx.stroke();
      [[-92, 66], [72, 28], [-52, -10], [52, -50]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (landmark.kind === "broken-gate") {
      ctx.fillRect(-76, -52, 9, 116);
      ctx.fillRect(68, -52, 9, 116);
      ctx.beginPath();
      ctx.moveTo(-72, -50);
      ctx.lineTo(-38, -78);
      ctx.lineTo(-5, -54);
      ctx.moveTo(18, -62);
      ctx.lineTo(42, -80);
      ctx.lineTo(72, -50);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-48, 66);
      ctx.lineTo(-18, 38);
      ctx.lineTo(10, 66);
      ctx.lineTo(38, 38);
      ctx.stroke();
    } else if (landmark.kind === "wind-notch") {
      ctx.beginPath();
      ctx.moveTo(-112, 70);
      ctx.lineTo(-52, -48);
      ctx.lineTo(-18, 18);
      ctx.lineTo(20, -58);
      ctx.lineTo(104, 70);
      ctx.stroke();
      for (let i = 0; i < 3; i += 1) {
        const y = -28 + i * 34;
        ctx.beginPath();
        ctx.moveTo(-18, y);
        ctx.quadraticCurveTo(16, y - 16, 58, y - 2);
        ctx.stroke();
      }
    } else if (landmark.kind === "prism-hall") {
      for (let i = 0; i < 3; i += 1) {
        const size = 34 + i * 28;
        ctx.save();
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.moveTo(-112, 0);
      ctx.lineTo(-64, 0);
      ctx.moveTo(64, 0);
      ctx.lineTo(112, 0);
      ctx.stroke();
    } else if (landmark.kind === "echo-rings") {
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, 30 + i * 27, Math.PI * 0.18, Math.PI * 1.82);
        ctx.stroke();
      }
      ctx.save();
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-13, -13, 26, 26);
      ctx.restore();
      ctx.fillRect(-2, -104, 4, 28);
    } else if (landmark.kind === "summit-mark") {
      ctx.beginPath();
      ctx.moveTo(-92, 66);
      ctx.lineTo(0, -74);
      ctx.lineTo(92, 66);
      ctx.moveTo(-46, -4);
      ctx.lineTo(-18, -30);
      ctx.lineTo(4, -8);
      ctx.lineTo(24, -34);
      ctx.lineTo(52, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -74, 12, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i += 1) {
        const angle = -Math.PI * 0.8 + i * Math.PI * 0.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 22, -74 + Math.sin(angle) * 22);
        ctx.lineTo(Math.cos(angle) * 36, -74 + Math.sin(angle) * 36);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawChapterWeather(time, atmosphere) {
    const chapter = chapterIndexForRoom(roomIndex);
    const count = settings.lowPerformance ? 6 : settings.calmEffects ? 10 : 16;
    const motion = prefersReducedMotion ? 0 : time;
    ctx.save();
    ctx.lineCap = "round";
    ctx.shadowBlur = 0;
    for (let i = 0; i < count; i += 1) {
      const seedX = (i * 173 + roomIndex * 67) % (W + 120);
      const seedY = (i * 83 + roomIndex * 31) % 330;
      if (chapter === 0) {
        const y = 72 + ((seedY + motion * (7 + i % 3)) % 250);
        const x = (seedX + Math.sin(motion * 0.45 + i) * 12) % W;
        ctx.globalAlpha = 0.12 + (i % 4) * 0.018;
        ctx.fillStyle = i % 3 === 0 ? atmosphere.rim : atmosphere.haze;
        ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
      } else if (chapter === 1) {
        const x = (seedX + motion * (3 + i % 2)) % (W + 80) - 40;
        const y = 76 + ((seedY + motion * (12 + i % 4)) % 300);
        ctx.globalAlpha = 0.08 + (i % 3) * 0.02;
        ctx.fillStyle = i % 4 === 0 ? atmosphere.rim : "#d8c7ad";
        ctx.fillRect(x, y, 1.5, 2.5);
      } else if (chapter === 2) {
        const x = (seedX + motion * (36 + i % 4 * 5)) % (W + 160) - 80;
        const y = 64 + seedY * 0.82 + Math.sin(motion * 1.2 + i) * 9;
        ctx.globalAlpha = 0.08 + (i % 3) * 0.025;
        ctx.strokeStyle = i % 4 === 0 ? atmosphere.rim : atmosphere.haze;
        ctx.lineWidth = i % 5 === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 18 + (i % 4) * 6, y - 3);
        ctx.stroke();
      } else {
        const x = seedX % W;
        const y = H - ((seedY + motion * (14 + i % 5)) % (H - 48));
        const twinkle = prefersReducedMotion ? 0.12 : 0.1 + Math.sin(time * 1.8 + i) * 0.04;
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = i % 4 === 0 ? atmosphere.rim : atmosphere.moon;
        const size = i % 6 === 0 ? 2 : 1;
        ctx.fillRect(x, y, size, size + 1);
      }
    }
    ctx.restore();
  }

  function drawHazardFields(time) {
    ctx.save();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tile = room.tiles[y][x];
        if (!HAZARDS.has(tile)) continue;
        drawHazardField(x * TILE, y * TILE, tile, time, x + y * 0.7);
      }
    }
    ctx.restore();
  }

  function drawHazardField(x, y, dir, time, phase) {
    const pulse = 0.5 + Math.sin(time * 5.6 + phase) * 0.5;
    ctx.save();
    ctx.translate(x + TILE / 2, y + TILE / 2);
    if (dir === "v") ctx.rotate(Math.PI);
    if (dir === "<") ctx.rotate(-Math.PI / 2);
    if (dir === ">") ctx.rotate(Math.PI / 2);
    ctx.translate(-TILE / 2, -TILE / 2);
    const field = ctx.createLinearGradient(0, TILE, 0, 2);
    field.addColorStop(0, `rgba(255, 92, 108, ${0.2 + pulse * 0.08})`);
    field.addColorStop(0.56, `rgba(255, 92, 108, ${0.08 + pulse * 0.08})`);
    field.addColorStop(1, "rgba(255, 92, 108, 0)");
    ctx.fillStyle = field;
    ctx.fillRect(-4, -1, TILE + 8, TILE + 6);
    ctx.strokeStyle = `rgba(255, 240, 160, ${0.18 + pulse * 0.2})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(2, TILE - 10);
    ctx.lineTo(TILE - 2, TILE - 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }


  function drawMountainLayer(color, yBase, offset, sway) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = yBase < 0.4 ? 0.62 : yBase < 0.6 ? 0.8 : 0.97;
    ctx.beginPath();
    const mountainPeaks = 6;
    const step = (W + 180) / mountainPeaks;
    const baseY = H * yBase + 110;
    const peaks = [];
    ctx.moveTo(-90, H);
    ctx.lineTo(-90, baseY);
    for (let i = 0; i < mountainPeaks; i += 1) {
      const startX = -90 + i * step;
      const nextX = startX + step;
      const peakX = startX + step * (0.38 + ((i * 17 + roomIndex * 7) % 18) / 100);
      const peakY = H * yBase - 32 - ((i * 47 + Math.round(offset)) % 76) * (0.7 + sway);
      const valleyY = baseY + (i % 2) * 18;
      const nextValleyY = baseY + ((i + 1) % 2) * 18;
      ctx.lineTo(startX, valleyY);
      ctx.lineTo(peakX - step * 0.17, peakY + 38);
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(peakX + step * 0.22, peakY + 48);
      ctx.lineTo(nextX, nextValleyY);
      peaks.push({ peakX, peakY, nextX, nextValleyY, step });
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = yBase < 0.4 ? 0.055 : yBase < 0.6 ? 0.07 : 0.085;
    ctx.fillStyle = "rgba(230, 240, 239, 0.9)";
    for (const peak of peaks) {
      ctx.beginPath();
      ctx.moveTo(peak.peakX, peak.peakY);
      ctx.lineTo(peak.peakX + peak.step * 0.22, peak.peakY + 48);
      ctx.lineTo(peak.nextX, peak.nextValleyY);
      ctx.lineTo(peak.peakX + peak.step * 0.08, peak.peakY + 30);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "rgba(231, 241, 241, 0.76)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawTiles(time) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tile = room.tiles[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (tile === "#") drawRock(px, py, x, y);
        if (tile === "C") drawCrumblePlatform(px, py, x, y, time);
        if (tile === "^") drawSpike(px, py, "up", time);
        if (tile === "v") drawSpike(px, py, "down", time);
        if (tile === "<") drawSpike(px, py, "left", time);
        if (tile === ">") drawSpike(px, py, "right", time);
      }
    }
  }

  function createTileSpriteSurface() {
    const scale = canvasBufferScale();
    const sprite = document.createElement("canvas");
    sprite.width = Math.round(TILE * scale);
    sprite.height = Math.round(TILE * scale);
    const spriteCtx = sprite.getContext("2d");
    spriteCtx.setTransform(scale, 0, 0, scale, 0, 0);
    return { sprite, spriteCtx, scale };
  }

  function rockTileSprite(leftSolid, rightSolid, belowSolid, topOpen, alternateCrack, surfaceKind) {
    const scale = canvasBufferScale();
    const material = CHAPTER_SURFACE_KINDS.includes(surfaceKind) ? surfaceKind : CHAPTER_SURFACE_KINDS[0];
    const key = `${scale}:${material}:${Number(leftSolid)}${Number(rightSolid)}${Number(belowSolid)}${Number(topOpen)}${Number(alternateCrack)}`;
    if (cachedRockTiles.has(key)) return cachedRockTiles.get(key);
    const { sprite, spriteCtx } = createTileSpriteSurface();
    spriteCtx.fillStyle = "#2b4054";
    spriteCtx.fillRect(0, 0, TILE, TILE);
    const grad = spriteCtx.createLinearGradient(0, 0, 0, TILE);
    grad.addColorStop(0, palette.rockLight);
    grad.addColorStop(0.13, palette.rock);
    grad.addColorStop(1, palette.rockDark);
    spriteCtx.fillStyle = grad;
    spriteCtx.fillRect(0, 0, TILE, TILE);
    if (!rightSolid) {
      spriteCtx.fillStyle = "rgba(10, 18, 29, 0.18)";
      spriteCtx.fillRect(TILE - 3, 3, 3, TILE - 3);
    }
    if (!leftSolid) {
      spriteCtx.fillStyle = "rgba(220,235,239,0.08)";
      spriteCtx.fillRect(0, 3, 1, TILE - 3);
    }
    if (!belowSolid) {
      spriteCtx.fillStyle = "rgba(10, 18, 29, 0.16)";
      spriteCtx.fillRect(0, TILE - 3, TILE, 3);
    }
    spriteCtx.strokeStyle = material === "old-peak"
      ? "rgba(238,207,157,0.12)"
      : material === "wind-cut"
        ? "rgba(196,232,225,0.13)"
        : material === "star-etched"
          ? "rgba(237,202,218,0.14)"
          : "rgba(220,235,239,0.12)";
    spriteCtx.lineWidth = 1;
    spriteCtx.beginPath();
    if (material === "old-peak") {
      if (!alternateCrack) {
        spriteCtx.moveTo(5, 10);
        spriteCtx.lineTo(18, 10);
        spriteCtx.lineTo(23, 15);
        spriteCtx.lineTo(28, 15);
      } else {
        spriteCtx.moveTo(4, 21);
        spriteCtx.lineTo(11, 15);
        spriteCtx.lineTo(25, 15);
      }
    } else if (material === "wind-cut") {
      const drift = alternateCrack ? 4 : 0;
      spriteCtx.moveTo(3 + drift, 19);
      spriteCtx.lineTo(15 + drift, 12);
      spriteCtx.moveTo(10 - drift, 26);
      spriteCtx.lineTo(25 - drift, 17);
      spriteCtx.moveTo(18, 9);
      spriteCtx.lineTo(29, 4);
    } else if (material === "star-etched") {
      spriteCtx.moveTo(16, 7);
      spriteCtx.lineTo(24, 15);
      spriteCtx.lineTo(16, 23);
      spriteCtx.lineTo(8, 15);
      spriteCtx.closePath();
      if (alternateCrack) {
        spriteCtx.moveTo(3, 25);
        spriteCtx.lineTo(9, 20);
        spriteCtx.moveTo(23, 9);
        spriteCtx.lineTo(29, 4);
      }
    } else if (!alternateCrack) {
      spriteCtx.moveTo(5, 8);
      spriteCtx.lineTo(22, 4);
      spriteCtx.lineTo(28, 21);
    } else {
      spriteCtx.moveTo(3, 20);
      spriteCtx.lineTo(17, 9);
      spriteCtx.lineTo(29, 14);
    }
    spriteCtx.stroke();
    if (material === "old-peak") {
      spriteCtx.fillStyle = "rgba(238,207,157,0.12)";
      spriteCtx.fillRect(alternateCrack ? 25 : 6, alternateCrack ? 7 : 22, 2, 2);
    } else if (material === "star-etched") {
      spriteCtx.fillStyle = "rgba(247,198,93,0.16)";
      spriteCtx.fillRect(alternateCrack ? 5 : 26, alternateCrack ? 6 : 24, 2, 2);
    }
    if (topOpen) {
      const snowInsetLeft = leftSolid ? 0 : 1;
      const snowInsetRight = rightSolid ? 0 : 1;
      spriteCtx.fillStyle = material === "old-peak"
        ? "#edf0e7"
        : material === "wind-cut"
          ? "#e8f4f2"
          : material === "star-etched"
            ? "#f1e8ef"
            : palette.snow;
      spriteCtx.fillRect(snowInsetLeft, 0, TILE - snowInsetLeft - snowInsetRight, 5);
      spriteCtx.fillStyle = material === "old-peak"
        ? "rgba(225,172,110,0.32)"
        : material === "wind-cut"
          ? "rgba(133,211,197,0.34)"
          : material === "star-etched"
            ? "rgba(230,174,203,0.34)"
            : "rgba(119,196,215,0.36)";
      spriteCtx.fillRect(snowInsetLeft, 5, TILE - snowInsetLeft - snowInsetRight, 2);
    }
    cachedRockTiles.set(key, sprite);
    return sprite;
  }

  function drawRock(x, y, gx, gy) {
    const leftSolid = SOLID.has(room.tiles[gy]?.[gx - 1]);
    const rightSolid = SOLID.has(room.tiles[gy]?.[gx + 1]);
    const belowSolid = SOLID.has(room.tiles[gy + 1]?.[gx]);
    const topOpen = gy > 0 && !SOLID.has(room.tiles[gy - 1]?.[gx]);
    const surfaceKind = CHAPTER_SURFACE_KINDS[chapterIndexForRoom(roomIndex)] || CHAPTER_SURFACE_KINDS[0];
    const sprite = rockTileSprite(leftSolid, rightSolid, belowSolid, topOpen, (gx + gy) % 2 !== 0, surfaceKind);
    ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, x, y, TILE, TILE);
  }

  function crumbleTileSprite() {
    const scale = canvasBufferScale();
    const key = String(scale);
    if (cachedCrumbleTiles.has(key)) return cachedCrumbleTiles.get(key);
    const { sprite, spriteCtx } = createTileSpriteSurface();
    const grad = spriteCtx.createLinearGradient(0, 0, TILE, TILE);
    grad.addColorStop(0, "#c8d7d6");
    grad.addColorStop(0.42, "#7f9293");
    grad.addColorStop(1, "#354a52");
    spriteCtx.fillStyle = grad;
    spriteCtx.fillRect(1, 1, TILE - 2, TILE - 2);
    spriteCtx.fillStyle = "rgba(239,248,246,0.2)";
    spriteCtx.fillRect(3, 3, TILE - 6, 4);
    spriteCtx.strokeStyle = "rgba(247,245,240,0.28)";
    spriteCtx.lineWidth = 2;
    spriteCtx.beginPath();
    spriteCtx.moveTo(7, 7);
    spriteCtx.lineTo(14, 17);
    spriteCtx.lineTo(10, 28);
    spriteCtx.moveTo(22, 6);
    spriteCtx.lineTo(16, 18);
    spriteCtx.lineTo(25, 28);
    spriteCtx.stroke();
    cachedCrumbleTiles.set(key, sprite);
    return sprite;
  }

  function drawCrumblePlatform(x, y, gx, gy, time) {
    const block = room.entities.crumble?.get(`${gx}:${gy}`);
    const armed = block ? block.timer / CRUMBLE_BREAK_TIME : 0;
    const danger = armed > 0 ? 1 - armed : 0;
    const jitter = armed > 0 ? Math.sin(time * 50 + gx) * (1 - armed) * 1.3 : 0;
    ctx.save();
    ctx.translate(jitter, 0);
    const sprite = crumbleTileSprite();
    ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, x, y, TILE, TILE);
    if (armed > 0) {
      ctx.fillStyle = `rgba(239,248,246,${armed * 0.12})`;
      ctx.fillRect(x + 3, y + 3, TILE - 6, 4);
      ctx.fillStyle = "rgba(18,18,19,0.52)";
      ctx.fillRect(x + 4, y + TILE - 7, TILE - 8, 3);
      ctx.fillStyle = `rgba(255,101,125,${0.62 + danger * 0.24})`;
      ctx.fillRect(x + 4, y + TILE - 7, (TILE - 8) * danger, 3);
      ctx.fillStyle = `rgba(255, 92, 108, ${0.12 + danger * 0.12})`;
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = `rgba(255, 240, 160, ${0.32 + danger * 0.16})`;
      for (let i = -1; i < 3; i += 1) {
        ctx.fillRect(x + i * 13 + danger * 5, y + TILE - 11, 8, 2);
      }
      ctx.strokeStyle = "rgba(255,101,125,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 7);
      ctx.lineTo(x + 14 + armed * 5, y + 17);
      ctx.lineTo(x + 10, y + 28);
      ctx.moveTo(x + 22, y + 6);
      ctx.lineTo(x + 16 - armed * 4, y + 18);
      ctx.lineTo(x + 25, y + 28);
      ctx.moveTo(x + 5, y + 22);
      ctx.lineTo(x + 13 + danger * 7, y + 24);
      ctx.moveTo(x + 19, y + 10);
      ctx.lineTo(x + 28, y + 18 + danger * 4);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,101,125,${0.18 + (1 - armed) * 0.28})`;
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      ctx.strokeStyle = `rgba(255,240,160,${0.2 + danger * 0.4})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
    }
    ctx.restore();
  }

  function drawSpike(x, y, dir, time) {
    ctx.save();
    ctx.translate(x + TILE / 2, y + TILE / 2);
    if (dir === "down") ctx.rotate(Math.PI);
    if (dir === "left") ctx.rotate(-Math.PI / 2);
    if (dir === "right") ctx.rotate(Math.PI / 2);
    ctx.translate(-TILE / 2, -TILE / 2);
    ctx.fillStyle = "rgba(71, 24, 39, 0.75)";
    ctx.fillRect(0, TILE - 8, TILE, 8);
    for (let i = 0; i < 3; i++) {
      const sx = i * 11 + 1;
      const flicker = Math.sin(time * 3 + i) * 0.35;
      ctx.fillStyle = palette.hot;
      ctx.beginPath();
      ctx.moveTo(sx, TILE - 6);
      ctx.lineTo(sx + 5.5, 5 + flicker);
      ctx.lineTo(sx + 11, TILE - 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,235,220,0.32)";
      ctx.beginPath();
      ctx.moveTo(sx + 5.5, 8 + flicker);
      ctx.lineTo(sx + 7, TILE - 9);
      ctx.lineTo(sx + 4, TILE - 9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRelayRoutes(time) {
    if (!practiceVisualsActive()) return;
    if (room.entities.relays.length === 0 && room.entities.prisms.length === 0) return;
    const relays = [...room.entities.relays, ...room.entities.prisms].sort((a, b) => a.x - b.x || a.y - b.y);
    const start = room.entities.checkpoints[0] || {
      x: room.entities.start.x + player.w / 2,
      y: room.entities.start.y + player.h / 2
    };
    const finish = room.entities.goal || room.entities.refills[0] || { x: W - 24, y: H - TILE * 2.4 };
    const points = [start, ...relays, finish];
    ctx.save();
    ctx.setLineDash([7, 9]);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = palette.cyan;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 5 : 11);
    ctx.strokeStyle = `rgba(118, 215, 255, ${settings.calmEffects ? 0.24 : 0.34})`;

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const wave = Math.sin(time * 2.2 + i * 0.7) * 4;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2 + wave;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);
      ctx.stroke();
      drawRouteArrow(a.x, a.y, b.x, b.y, i);
    }
    ctx.restore();
  }

  function activeRequirementKeys() {
    if (!activeDrill || activeDrill.room !== roomIndex || won) return [];
    if (activeDrill.mode === "style") return missingStyleRequirements(roomIndex);
    if (activeDrill.mode === "expert") return missingExpertRequirements(roomIndex);
    return [];
  }

  function requirementBeaconColor(key) {
    if (key === "prism" || key === "prismSpark" || key === "relayChain") return palette.gold;
    if (key === "spring" || key === "echo" || key === "recall") return palette.green;
    if (key === "crumble") return palette.hot;
    return palette.cyan;
  }

  function requirementBeaconPoints(key) {
    if (key === "spark" || key === "wallSpark") {
      return [{ x: player.x + player.w / 2, y: Math.max(36, player.y - 32), label: expertRequirementLabel(key) }];
    }
    if (key === "prismSpark") {
      const prisms = room.entities.prisms.length ? room.entities.prisms : [{ x: player.x + player.w / 2, y: player.y }];
      return prisms.map((prism) => ({
        x: prism.x,
        y: prism.y - 44,
        label: expertRequirementLabel(key)
      }));
    }
    if (key === "relay" || key === "relayChain") {
      return room.entities.relays.map((relay, index) => ({
        x: relay.x,
        y: relay.y - 28,
        label: key === "relayChain" ? `x${index + 1}` : expertRequirementLabel(key)
      }));
    }
    if (key === "spring") {
      return room.entities.springs.map((spring) => ({
        x: spring.x + spring.w / 2,
        y: spring.y - 14,
        label: expertRequirementLabel(key)
      }));
    }
    if (key === "updraft") {
      return room.entities.updrafts.map((updraft) => ({
        x: updraft.x + updraft.w / 2,
        y: Math.max(32, updraft.y - 28),
        label: expertRequirementLabel(key)
      }));
    }
    if (key === "prism") {
      return room.entities.prisms.map((prism) => ({
        x: prism.x,
        y: prism.y - 30,
        label: expertRequirementLabel(key)
      }));
    }
    if (key === "echo") {
      return room.entities.anchors.map((anchor) => ({
        x: anchor.x,
        y: anchor.y - 30,
        label: expertRequirementLabel(key)
      }));
    }
    if (key === "recall") {
      if (echoAnchor && echoAnchor.room === roomIndex) {
        return [{ x: echoAnchor.x + player.w / 2, y: echoAnchor.y - 18, label: expertRequirementLabel(key) }];
      }
      return room.entities.anchors.map((anchor) => ({ x: anchor.x, y: anchor.y - 30, label: "先锚点" }));
    }
    if (key === "crumble") {
      const blocks = [...room.entities.crumble.values()];
      if (!blocks.length) return [];
      const center = blocks.reduce((sum, block) => {
        sum.x += block.x * TILE + TILE / 2;
        sum.y += block.y * TILE + TILE / 2;
        return sum;
      }, { x: 0, y: 0 });
      return [{ x: center.x / blocks.length, y: center.y / blocks.length - 20, label: expertRequirementLabel(key) }];
    }
    return [];
  }

  function drawRequirementBeacons(time) {
    const keys = activeRequirementKeys();
    if (!keys.length || player.deadTimer > 0) return;
    const seen = new Set();
    let ordinal = 0;
    ctx.save();
    keys.forEach((key) => {
      if (seen.has(key)) return;
      seen.add(key);
      const color = requirementBeaconColor(key);
      const points = requirementBeaconPoints(key).slice(0, key === "relayChain" ? 4 : 3);
      points.forEach((point) => {
        drawRequirementBeacon(point.x, point.y, point.label, color, time, ordinal);
        ordinal += 1;
      });
    });
    ctx.restore();
  }

  function drawRequirementBeacon(x, y, label, color, time, ordinal) {
    const pulse = 0.5 + Math.sin(time * 5.4 + ordinal * 0.9) * 0.5;
    const radius = 19 + pulse * 5;
    const text = fitText(label, 76);
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 6 : 12);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([4, 5]);
    ctx.globalAlpha = 0.34 + pulse * 0.18;
    ctx.beginPath();
    ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const width = Math.min(88, Math.max(38, ctx.measureText(text).width + 14));
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = "rgba(7,12,20,0.72)";
    roundRect(ctx, x - width / 2, y - radius - 24, width, 18, 5);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y - radius - 15);
    ctx.restore();
  }

  function drawBestRoomPath(time) {
    if (!practiceVisualsActive()) return;
    const path = bestRoomPaths[roomIndex];
    if (!Array.isArray(path) || path.length < 2) return;
    const alpha = settings.ghostOpacity;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = `rgba(247, 198, 93, ${0.38 * alpha})`;
    ctx.shadowColor = palette.gold;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 4 : 9);
    ctx.beginPath();
    path.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < path.length; i += 12) {
      const point = path[i];
      const pulse = 1 + Math.sin(time * 5 + i) * 0.16;
      ctx.globalAlpha = alpha * 0.34;
      ctx.fillStyle = palette.gold;
      ctx.fillRect(point.x - 2 * pulse, point.y - 2 * pulse, 4 * pulse, 4 * pulse);
    }
    ctx.restore();
    drawReplayTag(path[0].x, path[0].y - 18, "PB 路线", palette.gold, 0.72 * alpha);
    const markers = replayActionMarkersFor(path);
    const labelledFamilies = new Set();
    for (const marker of markers) {
      const family = replayActionFamily(marker.kind);
      const showLabel = !labelledFamilies.has(family);
      drawReplayActionMarker(marker, alpha, showLabel);
      labelledFamilies.add(family);
    }
  }

  function drawRouteArrow(ax, ay, bx, by, index) {
    const t = 0.56;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const angle = Math.atan2(by - ay, bx - ax);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.setLineDash([]);
    ctx.fillStyle = index % 2 === 0 ? "rgba(248,251,255,0.52)" : "rgba(118,215,255,0.52)";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEntities(time) {
    for (const updraft of room.entities.updrafts) {
      drawUpdraft(updraft, time);
    }

    for (const checkpoint of room.entities.checkpoints) {
      const active = player.respawnRoom === roomIndex
        && Math.abs(player.respawnX - (checkpoint.x - player.w / 2)) < 2
        && Math.abs(player.respawnY - (checkpoint.y + TILE / 2 - player.h)) < 2;
      const baseY = checkpoint.y + TILE / 2 - 2;
      const poleX = checkpoint.x - 15;
      ctx.save();
      ctx.globalAlpha = active ? 0.72 : 0.4;
      ctx.strokeStyle = active ? palette.green : "rgba(143,227,155,0.62)";
      ctx.fillStyle = active ? "rgba(143,227,155,0.34)" : "rgba(143,227,155,0.14)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(poleX, baseY);
      ctx.lineTo(poleX, baseY - 24);
      ctx.lineTo(poleX + 13, baseY - 18);
      ctx.lineTo(poleX, baseY - 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(poleX - 6, baseY + 1);
      ctx.lineTo(poleX + 7, baseY + 1);
      ctx.stroke();
      ctx.restore();
    }

    for (const spring of room.entities.springs) {
      const squash = spring.pulse > 0 ? 5 : 0;
      const capY = spring.y + 1 + squash;
      const baseY = spring.y + 11;
      const coilTop = capY + 5;
      const coilBottom = baseY + 1;
      ctx.fillStyle = "#355563";
      roundRect(ctx, spring.x + 3, baseY, spring.w - 6, 5, 2);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = spring.pulse > 0 ? 0.8 : 0.62;
      ctx.strokeStyle = "#8fd19a";
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const offset of [9, 19]) {
        ctx.beginPath();
        ctx.moveTo(spring.x + offset, coilTop);
        ctx.lineTo(spring.x + offset + 3, (coilTop + coilBottom) / 2);
        ctx.lineTo(spring.x + offset, coilBottom);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = palette.green;
      roundRect(ctx, spring.x + 5, capY, spring.w - 10, 6, 2);
      ctx.fill();
      ctx.fillStyle = "#f8fbff";
      ctx.fillRect(spring.x + 9, capY + 1, spring.w - 18, 1.5);
    }

    for (const lumen of room.entities.lumens) {
      if (lumen.taken) continue;
      drawLumen(lumen, time);
    }

    for (const refill of room.entities.refills) {
      if (!refill.ready) {
        ctx.save();
        ctx.globalAlpha = 0.18;
        drawDiamond(refill.x, refill.y, 13, palette.cyan, time);
        ctx.restore();
        continue;
      }
      drawDiamond(refill.x, refill.y + Math.sin(refill.bob) * (prefersReducedMotion ? 0 : 4), 14, palette.cyan, time);
    }

    for (const relay of room.entities.relays) {
      drawRelay(relay, time);
    }

    for (const prism of room.entities.prisms) {
      drawPrism(prism, time);
    }

    for (const anchor of room.entities.anchors) {
      drawAnchor(anchor, time);
    }

    if (room.entities.goal) {
      drawSummitGoal(room.entities.goal, time);
    }
  }

  function drawSummitGoal(goal, time) {
    const motionTime = prefersReducedMotion ? 0 : time;
    const y = goal.y + Math.sin(motionTime * 3.2) * 1.5;
    const pulse = 0.86 + Math.sin(motionTime * 3.2) * 0.08;
    ctx.save();
    ctx.translate(goal.x, y);

    ctx.globalAlpha = 0.08 + pulse * 0.05;
    ctx.fillStyle = "#fff0c8";
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.72 + pulse * 0.18;
    ctx.strokeStyle = "#f6d477";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(246, 212, 119, 0.72)";
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 5 : 9);
    ctx.beginPath();
    ctx.arc(0, 0, 20, -Math.PI * 0.88, Math.PI * 0.88);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#fff4c7";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-10, 7);
    ctx.lineTo(-2, -5);
    ctx.lineTo(3, 1);
    ctx.lineTo(7, -4);
    ctx.lineTo(12, 7);
    ctx.stroke();

    ctx.fillStyle = "#fff4c7";
    ctx.beginPath();
    ctx.arc(-2, -10, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(246, 212, 119, 0.78)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 21);
    ctx.lineTo(0, 27);
    ctx.moveTo(-5, 27);
    ctx.lineTo(5, 27);
    ctx.stroke();
    ctx.restore();
  }

  function drawLumen(lumen, time) {
    const y = lumen.y + Math.sin(lumen.bob) * (prefersReducedMotion ? 0 : 4);
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(lumen.x, y, 17, -Math.PI * 0.82, Math.PI * 0.82);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,240,160,0.7)";
    ctx.fillRect(lumen.x - 4, y + 19, 8, 2);
    ctx.restore();
    drawDiamond(lumen.x, y, 11, palette.gold, time);
  }

  function drawUpdraft(updraft, time) {
    const motionTime = prefersReducedMotion ? 0 : time;
    const pulse = updraft.pulse > 0 ? updraft.pulse / 0.26 : 0;
    const fieldBounds = updraftFieldBounds(updraft);
    const x = fieldBounds.x + fieldBounds.w / 2;
    const top = fieldBounds.y;
    const bottom = fieldBounds.y + fieldBounds.h;
    ctx.save();
    const field = ctx.createLinearGradient(0, top, 0, bottom);
    field.addColorStop(0, `rgba(247,245,240,${0.05 + pulse * 0.035})`);
    field.addColorStop(0.5, `rgba(143,227,155,${0.145 + pulse * 0.075})`);
    field.addColorStop(1, "rgba(247,245,240,0)");
    ctx.fillStyle = field;
    ctx.fillRect(fieldBounds.x, top, fieldBounds.w, bottom - top);
    ctx.globalAlpha = 0.26 + pulse * 0.08;
    ctx.strokeStyle = "rgba(248,251,255,0.72)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.moveTo(fieldBounds.x + 3, bottom - 4);
    ctx.lineTo(fieldBounds.x + 3, top + 12);
    ctx.moveTo(fieldBounds.x + fieldBounds.w - 3, bottom - 4);
    ctx.lineTo(fieldBounds.x + fieldBounds.w - 3, top + 12);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.24 + pulse * 0.1;
    ctx.strokeStyle = "rgba(226, 236, 224, 0.82)";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    const streamSegments = settings.calmEffects ? 3 : 4;
    const streamSpan = Math.max(28, bottom - top - 54);
    for (let i = 0; i < streamSegments; i += 1) {
      const y = bottom - 24 - i * (streamSpan / Math.max(1, streamSegments - 1));
      const wave = Math.sin(motionTime * 3.1 + i * 1.7 + updraft.bob) * 3.5;
      ctx.beginPath();
      ctx.moveTo(x + wave, y + 10);
      ctx.bezierCurveTo(x - wave * 0.5, y + 4, x + wave * 0.5, y - 7, x - wave * 0.25, y - 14);
      ctx.stroke();
    }
    const arrowY = bottom - 34 + Math.sin(motionTime * 2.2 + updraft.bob) * 3;
    ctx.globalAlpha = 0.34 + pulse * 0.1;
    ctx.beginPath();
    ctx.moveTo(x - 6, arrowY + 4);
    ctx.lineTo(x, arrowY - 3);
    ctx.lineTo(x + 6, arrowY + 4);
    ctx.stroke();
    ctx.globalAlpha = 0.4 + pulse * 0.1;
    ctx.strokeStyle = "rgba(247,245,240,0.78)";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x - 5, top + 7);
    ctx.lineTo(x, top + 1 - pulse * 2);
    ctx.lineTo(x + 5, top + 7);
    ctx.moveTo(x, top + 2);
    ctx.lineTo(x, top + 13);
    ctx.stroke();
    ctx.restore();
  }

  function updraftFieldBounds(updraft) {
    const y = Math.max(0, updraft.y - TILE * 2.4);
    return {
      x: updraft.x - 10,
      y,
      w: updraft.w + 20,
      h: updraft.h + TILE * 0.9
    };
  }

  function drawRelay(relay, time) {
    const motionTime = prefersReducedMotion ? 0 : time;
    const relaySpin = motionTime * (settings.calmEffects ? 0.42 : 1.2);
    const y = relay.y + Math.sin(relay.bob) * (prefersReducedMotion ? 0 : 3);
    const active = relay.ready ? 1 : 0.28;
    const pulse = relay.pulse > 0 ? relay.pulse / 0.3 : 0;
    ctx.save();
    ctx.translate(relay.x, y);
    ctx.globalAlpha = 0.34 + active * 0.38 + pulse * 0.12;
    ctx.shadowColor = palette.cyan;
    ctx.shadowBlur = performanceShadowBlur(relay.ready ? (settings.calmEffects ? 2 : 8) : (settings.calmEffects ? 0 : 3));
    ctx.strokeStyle = relay.ready ? palette.cyan : "rgba(118, 215, 255, 0.42)";
    ctx.lineWidth = 2.2;
    ctx.rotate(relaySpin);
    ctx.beginPath();
    ctx.arc(0, 0, 13 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(-relaySpin * 1.75);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = relay.ready ? "rgba(248,251,255,0.9)" : "rgba(248,251,255,0.24)";
    ctx.fillRect(-2, -2, 4, 4);
    if (!relay.ready) {
      drawCooldownRing(0, 0, 19, 1 - relay.timer / RELAY_RESET_TIME, palette.cyan);
    } else if (!settings.calmEffects || pulse > 0.04) {
      ctx.globalAlpha = 0.16 + pulse * 0.24;
      ctx.strokeStyle = palette.cyan;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(-13, 0);
      ctx.moveTo(13, 0);
      ctx.lineTo(22, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPrism(prism, time) {
    const motionTime = prefersReducedMotion ? 0 : time;
    const prismSpin = motionTime * (settings.calmEffects ? 0.46 : 1.35);
    const y = prism.y + Math.sin(prism.bob) * (prefersReducedMotion ? 0 : 3);
    const active = prism.ready ? 1 : 0.22;
    const pulse = prism.pulse > 0 ? prism.pulse / 0.5 : 0;
    ctx.save();
    ctx.translate(prism.x, y);
    ctx.globalAlpha = 0.28 + active * 0.48 + pulse * 0.12;
    ctx.shadowColor = palette.gold;
    ctx.shadowBlur = performanceShadowBlur(prism.ready ? (settings.calmEffects ? 2 : 8) : (settings.calmEffects ? 0 : 3));
    ctx.rotate(-prismSpin);
    ctx.strokeStyle = prism.ready ? palette.gold : "rgba(247, 198, 93, 0.34)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -14 - pulse * 5);
    ctx.lineTo(13 + pulse * 4, 0);
    ctx.lineTo(0, 14 + pulse * 5);
    ctx.lineTo(-13 - pulse * 4, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.rotate(prismSpin * 1.78);
    ctx.fillStyle = prism.ready ? "rgba(255,240,160,0.7)" : "rgba(255,240,160,0.2)";
    ctx.fillRect(-4, -4, 8, 8);
    if (!prism.ready) {
      drawCooldownRing(0, 0, 22, 1 - prism.timer / PRISM_RESET_TIME, palette.gold);
    } else if (!settings.calmEffects || pulse > 0.04) {
      ctx.globalAlpha = 0.18 + pulse * 0.22;
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, 20 + pulse * 3, -Math.PI * 0.82, Math.PI * 0.82);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-19, -6);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-19, 6);
      ctx.moveTo(19, -6);
      ctx.lineTo(14, 0);
      ctx.lineTo(19, 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAnchor(anchor, time) {
    const active = echoAnchor && echoAnchor.room === roomIndex && Math.abs(echoAnchor.x + player.w / 2 - anchor.x) < 2;
    const pulse = Math.max(anchor.pulse / 0.3, recallPulseTimer / 0.42);
    ctx.save();
    ctx.translate(anchor.x, anchor.y);
    ctx.globalAlpha = active ? 0.78 + pulse * 0.12 : 0.64 + pulse * 0.1;
    ctx.shadowColor = palette.green;
    ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? (active ? 3 : 0) : (active ? 10 : 4));
    ctx.strokeStyle = active ? palette.green : "rgba(143,227,155,0.78)";
    ctx.lineWidth = active ? 2.4 : 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 13 + pulse * 4 + Math.sin((prefersReducedMotion ? 0 : time) * 3) * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -6, 3.5, 0, Math.PI * 2);
    ctx.moveTo(0, -2.5);
    ctx.lineTo(0, 8);
    ctx.moveTo(-8, 3);
    ctx.lineTo(-8, 7);
    ctx.lineTo(0, 11);
    ctx.lineTo(8, 7);
    ctx.lineTo(8, 3);
    ctx.stroke();
    if (active) {
      ctx.fillStyle = "rgba(143,227,155,0.42)";
      ctx.beginPath();
      ctx.arc(0, -6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (active && player.deadTimer <= 0 && recallCooldown <= 0) {
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin(time * 8) * 0.04;
      ctx.strokeStyle = palette.green;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(player.x + player.w / 2, player.y + player.h / 2);
      ctx.stroke();
      ctx.restore();
    }
    if (active && echoLessonTimer > 0) drawEchoLessonCue(anchor, time);
  }

  function drawCooldownRing(x, y, radius, progress, color) {
    const clamped = Math.max(0, Math.min(1, progress));
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = "rgba(248,251,255,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamped);
    ctx.stroke();
    ctx.restore();
  }

  function drawDiamond(x, y, radius, color, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(prefersReducedMotion ? Math.PI / 4 : time * 1.4);
    ctx.shadowColor = color;
    ctx.shadowBlur = performanceShadowBlur(18);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.8, 0);
    ctx.lineTo(0, radius);
    ctx.lineTo(-radius * 0.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.65);
    ctx.lineTo(radius * 0.3, 0);
    ctx.lineTo(0, radius * 0.35);
    ctx.lineTo(-radius * 0.3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPlayerAura(time) {
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const dash = visualRatio("dash", 0.24);
    const spark = visualRatio("spark", 0.28);
    const relay = visualRatio("relay", 0.34);
    const prism = visualRatio("prism", 0.42);
    const spring = visualRatio("spring", 0.24);
    const recall = visualRatio("recall", 0.34);
    const death = visualRatio("death", 0.28);
    const land = visualRatio("land", 0.18);
    const wall = visualRatio("wall", 0.22);
    const strongest = Math.max(dash, spark, relay, prism, spring, recall, death, wall);

    if (land > 0) {
      ctx.save();
      ctx.globalAlpha = land * 0.5;
      ctx.fillStyle = "rgba(231,244,247,0.72)";
      ctx.beginPath();
      ctx.ellipse(cx, player.y + player.h + 3, 18 + land * 10, 4 + land * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (strongest <= 0) return;

    const color = prism > 0 ? palette.gold
      : relay > 0 ? palette.cyan
        : spark > 0 ? "#fff0a0"
          : spring > 0 || recall > 0 ? palette.green
            : death > 0 ? palette.hot
              : palette.cyan;
    const radius = 17 + strongest * 12;
    ctx.save();
    ctx.globalAlpha = 0.08 + strongest * 0.18;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (dash > 0) {
      const dx = player.dashDirX || player.facing;
      const dy = player.dashDirY || 0;
      ctx.globalAlpha = 0.16 + dash * 0.28;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - dx * 32, cy - dy * 32);
      ctx.lineTo(cx - dx * 7, cy - dy * 7);
      ctx.stroke();
    }
    if (wall > 0) {
      const side = player.wallJumpLock > 0 ? -player.facing : player.wallDir || player.wallCoyoteDir || -player.facing;
      ctx.globalAlpha = 0.14 + wall * 0.28;
      ctx.beginPath();
      ctx.moveTo(cx + side * 20, cy - 18);
      ctx.lineTo(cx + side * 28, cy);
      ctx.lineTo(cx + side * 20, cy + 18);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGhosts() {
    for (const ghost of ghosts) {
      const t = Math.max(0, ghost.life / ghost.max);
      const cx = ghost.x + player.w / 2;
      const cy = ghost.y + player.h / 2;
      ctx.save();
      ctx.globalAlpha = ghost.alpha * t * 0.62;
      ctx.translate(cx, cy);
      ctx.scale(1 + (1 - t) * 0.12, 1 + (1 - t) * 0.06);
      ctx.translate(-cx, -cy);
      ctx.fillStyle = "#76b8cc";
      roundRect(ctx, ghost.x + 4, ghost.y + 8, player.w - 8, 14, 3);
      ctx.fill();
      ctx.fillStyle = "#fff0a0";
      ctx.fillRect(ghost.x + 7, ghost.y + 4, 7, 7);
      ctx.restore();
    }
  }

  function drawPlayerStateFrame(x, y, cx, cy, time, state) {
    const dash = state.dashPulse;
    const spark = state.sparkPulse;
    const wall = state.wallPulse;
    const side = state.walling ? player.wallDir : player.facing;
    const accent = state.accent;

    if (dash > 0.06) {
      const dx = player.dashDirX || player.facing;
      const dy = player.dashDirY || 0;
      ctx.save();
      ctx.globalAlpha = Math.min(0.68, 0.18 + dash * 0.52);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.shadowColor = accent;
      ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 5 : 12);
      ctx.beginPath();
      ctx.moveTo(cx - dx * (28 + dash * 12), cy - dy * (28 + dash * 12));
      ctx.lineTo(cx - dx * 7, cy - dy * 7);
      ctx.stroke();
      ctx.globalAlpha = Math.min(0.46, dash * 0.48);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - dx * 38 - dy * 7, cy - dy * 38 + dx * 7);
      ctx.lineTo(cx - dx * 15 - dy * 4, cy - dy * 15 + dx * 4);
      ctx.moveTo(cx - dx * 38 + dy * 7, cy - dy * 38 - dx * 7);
      ctx.lineTo(cx - dx * 15 + dy * 4, cy - dy * 15 - dx * 4);
      ctx.stroke();
      ctx.restore();
    }

    if (state.walling || wall > 0.12) {
      const grip = state.walling ? 1 : wall;
      const wallSide = player.wallDir || player.wallCoyoteDir || side || 1;
      ctx.save();
      ctx.globalAlpha = Math.min(0.72, 0.22 + grip * 0.5);
      ctx.fillStyle = palette.green;
      ctx.shadowColor = palette.green;
      ctx.shadowBlur = performanceShadowBlur(settings.calmEffects ? 3 : 8);
      const gx = cx + wallSide * 15;
      ctx.fillRect(gx, y + 10, wallSide * 5, 3);
      ctx.fillRect(gx - wallSide * 1, y + 17, wallSide * 4, 3);
      ctx.strokeStyle = "rgba(247,245,240,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx + wallSide * 8, y + 7);
      ctx.lineTo(gx + wallSide * 2, y + 14);
      ctx.lineTo(gx + wallSide * 8, y + 21);
      ctx.stroke();
      ctx.restore();
    }

    if (state.windborne) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = palette.cyan;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      for (let i = -1; i <= 1; i += 1) {
        const sway = prefersReducedMotion ? 0 : Math.sin(time * 7 + i * 1.8) * 2;
        ctx.beginPath();
        ctx.moveTo(cx + i * 8, y + 35);
        ctx.quadraticCurveTo(cx + i * 8 + sway, y + 25, cx + i * 7 - sway, y + 14);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (!state.airborne && state.run > 0.42) {
      ctx.save();
      ctx.globalAlpha = 0.18 + state.run * 0.16;
      ctx.strokeStyle = "rgba(247,245,240,0.55)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      const shift = Math.sin(time * 20) * 2;
      ctx.beginPath();
      ctx.moveTo(x - player.facing * (4 + shift), y + 30);
      ctx.lineTo(x - player.facing * (16 + shift), y + 31);
      ctx.moveTo(x + 6 - player.facing * (2 - shift), y + 31);
      ctx.lineTo(x + 6 - player.facing * (12 - shift), y + 32);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEchoLessonCue(anchor, time) {
    const touchActive = touchControls && !touchControls.hidden && getComputedStyle(touchControls).display !== "none";
    const label = touchActive
      ? "点「召」返回"
      : lastGamepadStatus.connected
        ? "Y · 召回"
        : `${keyCodeLabel(effectiveBindings().recall)} · 召回`;
    const fade = Math.min(1, echoLessonTimer * 2.5, (ECHO_LESSON_TIME - echoLessonTimer) * 3.5);
    const drift = prefersReducedMotion ? 0 : Math.sin(time * 3.2) * 1.2;
    ctx.save();
    ctx.font = "700 10px system-ui, sans-serif";
    const width = Math.ceil(ctx.measureText(label).width) + 22;
    const height = 25;
    const x = Math.max(10, Math.min(W - width - 10, anchor.x - width / 2));
    const y = Math.max(14, anchor.y - 48 + drift);
    ctx.globalAlpha = fade * 0.92;
    ctx.fillStyle = CANVAS_PANEL_BG;
    roundRect(ctx, x, y, width, height, 9);
    ctx.fill();
    ctx.strokeStyle = "rgba(84, 132, 116, 0.34)";
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 9);
    ctx.stroke();
    ctx.fillStyle = CANVAS_PANEL_INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + width / 2, y + height / 2 + 0.5);
    ctx.restore();
  }

  function drawPlayer(time) {
    const x = player.x;
    const y = player.y;
    const cx = x + player.w / 2;
    const cy = y + player.h / 2;
    const run = Math.min(1, Math.abs(player.vx) / MOVE_SPEED);
    const step = Math.sin(time * 16) * run;
    const over = player.overdrive > 0;
    const airborne = !player.wasGrounded && !player.onGround;
    const walling = player.wallDir !== 0 && airborne;
    const windborne = Boolean(player.inUpdraft);
    const dashPulse = Math.max(visualRatio("dash", 0.24), player.dashTimer / DASH_TIME);
    const sparkPulse = visualRatio("spark", 0.28);
    const prismPulse = visualRatio("prism", 0.42);
    const relayPulse = visualRatio("relay", 0.34);
    const springPulse = visualRatio("spring", 0.24);
    const recallPulse = visualRatio("recall", 0.34);
    const landPulse = visualRatio("land", 0.18);
    const wallPulse = Math.max(visualRatio("wall", 0.22), walling ? 0.28 : 0);
    const charged = dashPulse > 0.05 || sparkPulse > 0.05 || prismPulse > 0.05 || relayPulse > 0.05;
    const coat = over ? "#f7c65d" : player.dashes > 0 ? "#2fc7d6" : "#6f8fa8";
    const coatDark = over ? "#9f6a1b" : player.dashes > 0 ? "#146d86" : "#304d63";
    const accent = prismPulse > 0 ? palette.gold
      : relayPulse > 0 ? palette.cyan
        : sparkPulse > 0 ? "#fff0a0"
          : over ? palette.green
            : player.dashes > 0 ? palette.cyan
              : "#9bb4c6";
    const hairColor = "#294657";
    const playerVisualScale = isPortraitViewport() ? 1.38 : 1.09;
    const squashX = 1 + landPulse * 0.16 + dashPulse * 0.08 - springPulse * 0.05;
    const squashY = 1 - landPulse * 0.14 - dashPulse * 0.06 + Math.max(sparkPulse, springPulse) * 0.1 + (windborne ? 0.035 : 0);
    const lean = Math.max(-0.22, Math.min(0.22, player.vx / 980 + dashPulse * player.dashDirX * 0.12 + wallPulse * player.facing * 0.05 + (windborne && !prefersReducedMotion ? Math.sin(time * 6) * 0.018 : 0)));
    const eyeX = x + 11 + player.facing * 2;

    ctx.save();

    if (over || prismPulse > 0 || recallPulse > 0) {
      const glow = Math.max(prismPulse, recallPulse, over ? 0.18 : 0);
      ctx.globalAlpha = 0.12 + glow * 0.28 + Math.sin(time * 18) * 0.03;
      ctx.strokeStyle = prismPulse > 0 ? palette.gold : recallPulse > 0 ? palette.green : palette.gold;
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = performanceShadowBlur(10);
      ctx.beginPath();
      ctx.arc(cx, cy, 19 + glow * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // The contact shadow belongs to the floor, not the character. Keeping it
    // attached while airborne reads as a third black foot at this sprite size.
    if (!airborne) {
      ctx.fillStyle = "rgba(23,49,60,0.1)";
      ctx.beginPath();
      ctx.ellipse(cx, y + player.h + 3.2, 9.5 + run * 1.4 + landPulse * 3, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawPlayerStateFrame(x, y, cx, cy, time, {
      dashPulse,
      sparkPulse,
      wallPulse,
      walling,
      windborne,
      airborne,
      run,
      accent
    });

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(lean);
    ctx.translate(0, player.h / 2);
    ctx.scale(playerVisualScale, playerVisualScale);
    ctx.translate(0, -player.h / 2);
    ctx.scale(squashX, squashY);
    ctx.translate(-cx, -cy);

    if (charged) {
      ctx.globalAlpha = 0.12 + Math.max(dashPulse, sparkPulse, relayPulse, prismPulse) * 0.2;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.ellipse(cx - player.facing * 3, y + 16, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const outline = "rgba(31, 66, 82, 0.58)";
    const skin = "#f1c7a4";
    const handSkin = "#d6aa8f";
    if (airborne) {
      // Keep the jump pose tucked beneath the coat. Wide, thin toe strokes turn
      // into forked hooks at gameplay scale, so both rounded legs stay compact
      // and let the rear leg recede without drawing a separate shoe shape.
      const riseTuck = Math.max(0, Math.min(1, -player.vy / 420));
      const fallExtend = Math.max(0, Math.min(1, player.vy / 520));
      const leadKneeX = 2.75 + riseTuck * 0.5 - fallExtend * 0.15;
      const leadKneeY = 2.45 + fallExtend * 0.65;
      const leadEndX = 4.25 + riseTuck * 0.55 + fallExtend * 0.2;
      const leadEndY = 5.55 - riseTuck * 0.55 + fallExtend * 1.35;
      const rearKneeX = -2.65 - riseTuck * 0.45 + fallExtend * 0.2;
      const rearKneeY = 1.95 + fallExtend * 0.55;
      const rearEndX = -3.25 - riseTuck * 0.35 + fallExtend * 0.45;
      const rearEndY = 4.45 - riseTuck * 0.8 + fallExtend * 1.45;
      ctx.save();
      ctx.translate(cx, y + 21);
      ctx.scale(player.facing, 1);

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.save();
      ctx.globalAlpha = 0.76;
      ctx.strokeStyle = "#527f8d";
      ctx.lineWidth = 2.65;
      ctx.beginPath();
      ctx.moveTo(-2.35, 0.25);
      ctx.quadraticCurveTo(rearKneeX, rearKneeY, rearEndX, rearEndY);
      ctx.stroke();
      ctx.restore();

      const leadLegTone = ctx.createLinearGradient(0, 0, 0, 7.5);
      leadLegTone.addColorStop(0, "#6b9aa3");
      leadLegTone.addColorStop(1, "#477988");
      ctx.strokeStyle = leadLegTone;
      ctx.lineWidth = 3.05;
      ctx.beginPath();
      ctx.moveTo(2.35, 0.25);
      ctx.quadraticCurveTo(leadKneeX, leadKneeY, leadEndX, leadEndY);
      ctx.stroke();
      ctx.restore();
    } else {
      const stride = step * 2.2;
      const frontFootX = x + 5 + stride;
      const backFootX = x + 15 - stride;
      const groundedLegTone = ctx.createLinearGradient(0, y + 20, 0, y + 29);
      groundedLegTone.addColorStop(0, "#47798a");
      groundedLegTone.addColorStop(1, "#355f70");
      ctx.strokeStyle = groundedLegTone;
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x + 7.2, y + 20.5);
      ctx.quadraticCurveTo(x + 6.8 + stride * 0.35, y + 24.4, frontFootX, y + 28);
      ctx.moveTo(x + 12.8, y + 20.5);
      ctx.quadraticCurveTo(x + 13.2 - stride * 0.35, y + 24.4, backFootX, y + 28);
      ctx.stroke();
    }

    const packX = player.facing > 0 ? x + 2.4 : x + 12.4;
    ctx.fillStyle = "#41677a";
    roundRect(ctx, packX, y + 11.5, 5.2, 8.8, 2.6);
    ctx.fill();

    const backArmX = cx - player.facing * 2;
    const backHandX = walling ? cx + player.wallDir * 12 : cx - player.facing * (7 + dashPulse * 2);
    ctx.strokeStyle = coatDark;
    ctx.lineWidth = 2.65;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(backArmX, y + 12);
    ctx.lineTo(backHandX, y + 16 + step);
    ctx.stroke();
    ctx.fillStyle = walling ? palette.green : handSkin;
    ctx.beginPath();
    ctx.arc(backHandX, y + 16 + step, walling ? 1.3 : 1.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = coat;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 11);
    ctx.quadraticCurveTo(cx, y + 8.5, x + 15, y + 11);
    ctx.lineTo(x + 14.5, y + 22);
    ctx.quadraticCurveTo(cx, y + 24, x + 4.5, y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = coatDark;
    ctx.fillRect(x + 5.5, y + 18.5, 8.5, 2);
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.fillRect(x + 7, y + 11.5, 1.5, 6);

    const frontHandX = cx + player.facing * (8 + dashPulse * 2);
    ctx.strokeStyle = coatDark;
    ctx.lineWidth = 2.55;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx + player.facing * 2, y + 12);
    ctx.lineTo(frontHandX, y + 15 - step * 0.8);
    ctx.stroke();
    ctx.fillStyle = handSkin;
    ctx.beginPath();
    ctx.arc(frontHandX, y + 15 - step * 0.8, 1.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(x + 4 - dashPulse * player.facing, y + 5);
    ctx.quadraticCurveTo(x + 10, y + 1.5 - Math.max(sparkPulse, springPulse), x + 16, y + 5);
    ctx.lineTo(x + 16 + player.facing, y + 11);
    ctx.lineTo(x + 11, y + 12.5);
    ctx.lineTo(x + 4, y + 10.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = skin;
    roundRect(ctx, x + 7 + player.facing, y + 5, 8, 8, 3);
    ctx.fill();
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 5.5);
    ctx.lineTo(x + 15.5, y + 4.5);
    ctx.lineTo(x + 13 + player.facing, y + 7.5);
    ctx.lineTo(x + 7, y + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1b2533";
    ctx.beginPath();
    ctx.arc(eyeX, y + 9, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }
  function drawParticles() {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.max);
      ctx.save();
      ctx.globalAlpha = alpha * 0.82;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }

  function drawVignette() {
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.72);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(17,29,43,0.18)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function crumbleCount() {
    if (!room.entities.crumble) return { active: 0, total: 0 };
    let active = 0;
    for (const block of room.entities.crumble.values()) {
      if (room.tiles[block.y]?.[block.x] === "C") active += 1;
    }
    return { active, total: room.entities.crumble.size };
  }

  function updatePortraitBrief() {
    if (!portraitChapter || !portraitRoomTitle || !portraitRoomGoal) return;
    const startContext = !started;
    const hasProgress = startContext && hasTrainingProgress();
    const target = hasProgress ? recommendedPracticeRoom() : roomIndex;
    const chapter = ROOM_CHAPTER_LABELS[target] || "山巅";
    const chapterTone = target < 3 ? "gate" : target < 6 ? "old-peak" : target < 8 ? "wind" : "summit";
    if (shell && shell.dataset.portraitChapter !== chapterTone) shell.dataset.portraitChapter = chapterTone;
    const mode = resolveDrillMode(target);
    portraitChapter.textContent = startContext
      ? `${hasProgress ? "上次训练" : "攀登起点"} · ${chapter}`
      : chapter;
    portraitRoomTitle.textContent = `R${target + 1} · ${ROOM_NAMES[target] || "Summit"}`;
    portraitRoomGoal.textContent = `${hasProgress ? `${drillModeLabel(mode)} · ` : ""}${ROOM_PURPOSES[target] || ROOM_GUIDES[target] || "保持节奏，向上。"}`;
  }

  function updateHud() {
    syncPlayModeClass();
    const found = collected.size;
    const roomBest = bestRoomTimes[roomIndex] || 0;
    const grade = splitGrade(roomBest, ROOM_TARGETS[roomIndex]);
    lumenCount.textContent = `✦ ${found}/${totalLumens}`;
    lumenCount.title = "微光会恢复冲刺；满冲刺拾取时可储备第二次冲刺";
    roomCount.textContent = `R${roomIndex + 1}/${maps.length}${grade ? ` ${grade}` : ""}`;
    syncTouchRecallButton();
    updatePortraitBrief();
    splitTimeText.textContent = formatTime(roomTime);
    const splitReference = roomBest || ROOM_TARGETS[roomIndex] || 0;
    const splitDelta = splitReference > 0 ? roomTime - splitReference : 0;
    if (splitDeltaText) {
      splitDeltaText.textContent = splitReference > 0 ? formatDelta(splitDelta) : "--";
    splitDeltaText.title = roomBest > 0 ? "房间最佳差值" : "目标时间差值";
    }
    if (flowCountText) flowCountText.textContent = `F ${Math.floor(flowPeak || flowScore)}`;
    if (flowCountText) flowCountText.title = `${flowTierLabel(flowPeak || flowScore)} flow`;
    updatePracticeCoach();
    runTimeText.textContent = formatTime(runTime);
    deathCountText.textContent = `失 ${deathCount}`;
    splitTimeText.classList.toggle("best", roomBest > 0 && roomTime > 0 && roomTime <= roomBest);
    splitDeltaText?.classList.toggle("best", splitReference > 0 && splitDelta <= 0);
    splitDeltaText?.classList.toggle("behind", splitReference > 0 && splitDelta > 0);
    flowCountText?.classList.toggle("best", bestFlow > 0 && Math.floor(flowPeak) >= Math.floor(bestFlow));
    runTimeText.classList.toggle("best", bestTime > 0 && runTime > 0 && runTime <= bestTime);
    const dashCharges = Math.max(0, Math.min(2, Math.round(player.dashes)));
    dashFill.style.transform = `scaleX(${dashCharges > 0 ? 1 : 0.12})`;
    dashMeter?.setAttribute("aria-valuenow", String(dashCharges));
    dashMeter?.setAttribute("aria-valuetext", dashCharges > 0 ? `${dashCharges} 次冲刺可用` : "冲刺已耗尽");
    stage.classList.toggle("lumen-reserve", player.lumenReserve || player.dashes > 1);
    const staminaRatio = Math.max(0, Math.min(1, player.stamina / MAX_STAMINA));
    const staminaPercent = Math.round(staminaRatio * 100);
    staminaFill.style.transform = `scaleX(${Math.max(0.08, staminaRatio)})`;
    staminaMeter?.setAttribute("aria-valuenow", String(staminaPercent));
    staminaMeter?.setAttribute("aria-valuetext", `体力 ${staminaPercent}%`);
    const paceLimit = activeRoomTimeLimit(roomIndex) || splitReference;
    const paceProgress = paceLimit > 0 && timingArmed ? Math.max(0, Math.min(1, roomTime / paceLimit)) : 0;
    if (paceFill) paceFill.style.transform = `scaleX(${paceProgress})`;
    if (paceMeter) {
      paceMeter.classList.toggle("ahead", paceLimit > 0 && roomTime <= paceLimit);
      paceMeter.classList.toggle("behind", paceLimit > 0 && roomTime > paceLimit);
      paceMeter.title = paceLimit > 0 ? `房间目标 ${formatTime(paceLimit)} / ${formatDelta(roomTime - paceLimit)}` : "房间目标节奏";
    }
    syncRoomSelect();
    updateDebug();
  }

  function updateDebug() {
    if (!debugVisible) return;
    const crumble = crumbleCount();
    debugPanel.textContent = [
      `fps ${Math.round(fps)}  room ${roomIndex + 1}/${maps.length}  ${ROOM_NAMES[roomIndex] || ""}`,
      `time ${formatTime(runTime)}  split ${formatTime(roomTime)} best ${formatTime(bestRoomTimes[roomIndex] || 0)} target ${formatTime(ROOM_TARGETS[roomIndex] || 0)}`,
      `pos ${player.x.toFixed(1)}, ${player.y.toFixed(1)}`,
      `vel ${player.vx.toFixed(1)}, ${player.vy.toFixed(1)}`,
      `ground ${player.onGround ? 1 : 0}  wall ${player.wallDir}  wc ${player.wallCoyote.toFixed(3)}`,
      `coyote ${player.coyote.toFixed(3)}  jbuf ${player.jumpBuffer.toFixed(3)}`,
      `dash ${player.dashes}  dbuf ${player.dashBuffer.toFixed(3)}  dt ${player.dashTimer.toFixed(3)}`,
      `spark ${player.sparkHopTimer.toFixed(3)}  lock ${player.wallJumpLock.toFixed(3)}  over ${player.overdrive.toFixed(3)}`,
      `feel ${feelCueText || "none"}  apex ${actionPulse.apex.toFixed(3)}  aim ${lastAimTimer.toFixed(3)}`,
      `route ${routeSlotShort(routeFocusData(roomIndex).slot)} ${routeCueReason || "none"} ${routeCueTimer.toFixed(2)}  mastery ${masteryPopupText || roomMasteryLevel(roomMasteryScore(roomIndex))}`,
      `tip ${gameTipKind || "none"} ${gameTipTimer.toFixed(2)}`,
      `relay chain ${relayChain}  best ${bestRelayChain}`,
      `flow ${Math.floor(flowScore)} peak ${Math.floor(flowPeak)} best ${Math.floor(bestFlow)}  deaths ${deathCount}`,
      `last death ${lastDeathReason === "none" ? "none" : deathReasonLabel(lastDeathReason)}  reasons ${deathReasonSummary()}`,
      `room focus ${roomFocusDetails(roomIndex)}`,
      `coach ${practiceCoachText()}`,
      `stamina ${(player.stamina * 100).toFixed(0)}  anchor ${echoAnchor && echoAnchor.room === roomIndex ? 1 : 0}`,
      `hitstop ${hitStopTimer.toFixed(3)}  ghosts ${ghosts.length}/${currentEffectLimit("ghosts")}`,
      `effects p ${particles.length}/${currentEffectLimit("particles")}  s ${shards.length}/${currentEffectLimit("shards")}  t ${lightTrails.length}/${currentEffectLimit("lightTrails")}`,
      `relays ${room.entities.relays.length}  prisms ${room.entities.prisms.length}  up ${room.entities.updrafts.length}  crumble ${crumble.active}/${crumble.total}`,
      `paths room ${roomPath.length}  best ${Array.isArray(bestRoomPaths[roomIndex]) ? bestRoomPaths[roomIndex].length : 0}  lines ${settings.practiceLines ? 1 : 0}  ghost ${settings.ghostOpacity.toFixed(2)}`,
      `replay actions ${replayActionMarkersFor(bestRoomPaths[roomIndex]).length}  active ${practiceVisualsActive() ? 1 : 0}`,
      `shake ${settings.shake.toFixed(2)}  keys ${settings.controlsPreset}  grab ${settings.grabMode}${grabLatched ? " latched" : ""}  pad dz ${settings.gamepadDeadzone.toFixed(2)}`,
      `audio ${settings.audioEnabled ? settings.audioVolume.toFixed(2) : "off"}  route ${activeRouteContract ? `${activeRouteContract.id}:${activeRouteContract.step + 1}` : "none"}`
    ].join("\n");
  }

  function syncTouchRecallButton() {
    if (!touchRecallButton) return;
    const roomHasAnchor = Boolean(room?.entities?.anchors?.length);
    const anchorActive = Boolean(echoAnchor && echoAnchor.room === roomIndex);
    const available = roomHasAnchor && anchorActive && recallCooldown <= 0 && player.deadTimer <= 0 && !won;
    touchRecallButton.hidden = !roomHasAnchor;
    touchRecallButton.disabled = !available;
    touchRecallButton.classList.toggle("available", available);
    if (!available) {
      touch.recall = false;
      touchRecallButton.classList.remove("active");
    }
    touchRecallButton.setAttribute(
      "aria-label",
      available ? "召回到回声锚点" : anchorActive ? "召回冷却中" : "先激活回声锚点"
    );
  }

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }
})();
