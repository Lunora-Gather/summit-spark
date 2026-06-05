(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const stage = canvas.closest(".stage");
  const startButton = document.getElementById("startButton");
  const openTrainingButton = document.getElementById("openTrainingButton");
  const resumeTrainingButton = document.getElementById("resumeTrainingButton");
  const startReadiness = document.getElementById("startReadiness");
  const loadStatus = document.getElementById("loadStatus");
  const bootFallback = document.getElementById("bootFallback");
  const overlay = document.getElementById("overlay");
  const lumenCount = document.getElementById("lumenCount");
  const roomCount = document.getElementById("roomCount");
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
  const settingsPanel = document.getElementById("settingsPanel");
  const settingsCloseButton = document.getElementById("settingsClose");
  const shakeSlider = document.getElementById("shakeSlider");
  const debugToggle = document.getElementById("debugToggle");
  const calmEffectsToggle = document.getElementById("calmEffectsToggle");
  const lowPerformanceToggle = document.getElementById("lowPerformanceToggle");
  const practiceLinesToggle = document.getElementById("practiceLinesToggle");
  const ghostOpacitySlider = document.getElementById("ghostOpacitySlider");
  const audioToggle = document.getElementById("audioToggle");
  const audioVolumeSlider = document.getElementById("audioVolumeSlider");
  const audioTestButton = document.getElementById("audioTestButton");
  const feedbackTypeSelect = document.getElementById("feedbackType");
  const feedbackNoteInput = document.getElementById("feedbackNote");
  const diagnosticsButton = document.getElementById("diagnosticsButton");
  const feedbackTemplateButton = document.getElementById("feedbackTemplateButton");
  const controlPresetSelect = document.getElementById("controlPreset");
  const grabModeSelect = document.getElementById("grabMode");
  const gamepadDeadzoneSlider = document.getElementById("gamepadDeadzoneSlider");
  const gamepadStatusOutput = document.getElementById("gamepadStatus");
  const touchSizeSlider = document.getElementById("touchSizeSlider");
  const saveExportButton = document.getElementById("saveExportButton");
  const saveDownloadButton = document.getElementById("saveDownloadButton");
  const saveImportButton = document.getElementById("saveImportButton");
  const saveImportText = document.getElementById("saveImportText");
  const saveImportStatus = document.getElementById("saveImportStatus");
  const roomSelect = document.getElementById("roomSelect");
  const roomBrief = document.getElementById("roomBrief");
  const practicePriority = document.getElementById("practicePriority");
  const chapterOverview = document.getElementById("chapterOverview");
  const practicePlan = document.getElementById("practicePlan");
  const routeContracts = document.getElementById("routeContracts");
  const feelLab = document.getElementById("feelLab");
  const focusRoomButton = document.getElementById("focusRoomButton");
  const focusResetButton = document.getElementById("focusResetButton");
  const coachSummary = document.getElementById("coachSummary");
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
  const dashFill = document.querySelector(".dash-meter span");
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
  const AIR_ACCEL = 3400;
  const TURN_ACCEL = 7600;
  const FRICTION = 5600;
  const JUMP = 515;
  const WALL_JUMP_X = 330;
  const DASH_SPEED = 585;
  const DASH_TIME = 0.135;
  const MAX_STAMINA = 1;
  const COYOTE_TIME = 0.105;
  const JUMP_BUFFER_TIME = 0.115;
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
  const WALL_COYOTE_TIME = 0.105;
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
  const JUMP_CUT_MULTIPLIER = 0.52;
  const DEATH_RETRY_TIME = 0.26;
  const DASH_HITSTOP = 0.018;
  const DEATH_HITSTOP = 0.035;
  const SHAKE_INTENSITY = 0;
  const LIGHT_TRAIL_LIFE = 0.62;
  const LIGHT_TRAIL_WIDTH = 42;
  const LIGHT_TRAIL_HEIGHT = 4;
  const LIGHT_TRAIL_STEP = 16;
  const DEATH_MARK_LIFE = 4.5;
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
  const DEATH_REPLAY_LIFE = 5.2;
  const MAX_ROOM_PATH_POINTS = 420;
  const ROOM_BEST_FLASH_TIME = 1.15;
  const SPLIT_POPUP_TIME = 1.25;
  const FOCUS_POPUP_TIME = 1.35;
  const DEATH_COACH_TIME = 2.35;
  const FAILURE_REHEARSAL_TIME = 4.6;
  const GAME_TIP_TIME = 4.8;
  const FOCUS_RESET_CONFIRM_MS = 2200;
  const FEEL_CUE_TIME = 0.72;
  const ROUTE_CUE_TIME = 5.4;
  const MASTERY_POPUP_TIME = 1.8;
  const SETTINGS_KEY = "summit-spark-settings";
  const SETTINGS_SCHEMA_VERSION = 2;
  const PROFILE_SCHEMA_VERSION = 2;
  const ROOM_FOCUS_SCHEMA_VERSION = 2;
  const SAVE_ARCHIVE_SCHEMA_VERSION = 1;
  const SAVE_ARCHIVE_KIND = "summit-spark-save";
  const SAVE_ARCHIVE_MAX_CHARS = 240000;
  const ACTION_PULSE_TIME = 0.22;
  const BEST_FLOW_KEY = "summit-spark-best-flow";
  const FLOW_DECAY_TIME = 1.9;
  const FLOW_DECAY_RATE = 38;
  const FLOW_POPUP_TIME = 0.62;
  const NEAR_MISS_COOLDOWN = 0.48;
  const ECHO_RECALL_COOLDOWN = 0.32;
  const ROOM_INTRO_TIME = 1.45;
  const CURRENT_PATH_DRAW_POINTS = 90;
  const CRUMBLE_BREAK_TIME = 0.42;
  const DASH_AIM_PREVIEW_LENGTH = 58;
  const DASH_AIM_PREVIEW_MIN_ALPHA = 0.24;
  const CRUMBLE_DEATH_MEMORY = 1.4;
  const DEATH_REASON_KEYS = ["spike", "fall", "crumble", "retry", "room"];
  const DEATH_REASON_LABELS = {
    spike: "SPIKE",
    fall: "FALL",
    crumble: "CRUMBLE",
    retry: "RETRY",
    room: "ROOM"
  };
  const GAME_TIP_CLASSES = ["coach", "onboarding", "death", "route", "storage"];
  const FLOW_CHALLENGE_TARGET = 900;
  const GAMEPAD_DEADZONE_DEFAULT = 0.28;
  const GAMEPAD_DEADZONE_MIN = 0.12;
  const GAMEPAD_DEADZONE_MAX = 0.45;
  const TOUCH_SIZE_DEFAULT = 48;
  const TOUCH_SIZE_MIN = 44;
  const TOUCH_SIZE_MAX = 64;

  const SOLID = new Set(["#", "C"]);
  const HAZARDS = new Set(["^", "v", "<", ">"]);
  const CONTROL_PRESETS = {
    comfort: {
      jump: ["Space", "KeyC", "KeyJ"],
      dash: ["KeyX", "KeyK", "ShiftLeft", "ShiftRight", "KeyE"],
      grab: ["KeyZ", "KeyL", "ControlLeft", "ControlRight", "KeyV"]
    },
    classic: {
      jump: ["Space", "KeyZ", "KeyJ"],
      dash: ["KeyX", "ShiftLeft", "ShiftRight", "KeyK"],
      grab: ["KeyC", "ControlLeft", "ControlRight", "KeyL", "KeyV"]
    }
  };
  const RECALL_CODES = new Set(["KeyQ", "Backspace"]);
  const ALL_ACTION_CODES = new Set(Object.values(CONTROL_PRESETS).flatMap((preset) => [
    ...preset.jump,
    ...preset.dash,
    ...preset.grab
  ]));
  const START_CODES = new Set(["Enter", ...ALL_ACTION_CODES]);
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

  const ROOM_TARGETS = [8.8, 10.0, 11.2, 12.8, 14.5, 16.0, 18.2, 20.0, 21.5, 23.5];
  const ROOM_NAMES = ["\u8d77\u52bf\u5c71\u95e8", "\u5149\u7ee7\u6a2a\u6865", "\u5f39\u7c27\u96fe\u53f0", "\u4e09\u6bb5\u8fde\u9501", "\u68f1\u7ebf\u56de\u73af", "\u65e7\u5cf0\u51fa\u53e3", "\u98ce\u5347\u5ce1\u53e3", "\u68f1\u955c\u957f\u5eca", "\u56de\u58f0\u5ca9\u573a", "\u661f\u9876\u7ec8\u7ebf"];
  const ROOM_TIERS = ["learn", "learn", "learn", "combine", "combine", "combine", "pressure", "pressure", "finale", "finale"];
  const ROOM_SKILLS = [
    ["jump", "dash", "landing"],
    ["dash", "relay", "recover"],
    ["jump", "spring", "pace"],
    ["relay", "chain", "hazard"],
    ["relay", "route", "recover"],
    ["relay", "spring", "exit"],
    ["wind", "crumble", "echo"],
    ["overdrive", "relay", "crumble"],
    ["echo", "overdrive", "crumble", "wind"],
    ["finale", "relay", "overdrive", "crumble"]
  ];
  const SKILL_LABELS = {
    jump: "跳跃",
    dash: "冲刺",
    landing: "落点",
    relay: "光继",
    recover: "恢复",
    spring: "弹簧",
    pace: "节奏",
    chain: "连锁",
    hazard: "危险线",
    route: "路线",
    exit: "出口",
    wind: "风",
    crumble: "脆冰",
    echo: "回声",
    overdrive: "棱镜",
    finale: "终点"
  };
  const ROOM_GUIDES = [
    "先把落点站稳，再追求更快。",
    "带着冲刺意图触发光继点，然后尽早回收节奏。",
    "让弹簧给高度，过顶后再花冲刺。",
    "先读安全平台线，再把光继点连起来。",
    "保持折返节奏，同时留一个恢复选择。",
    "把弹簧当作出口前的节拍重置。",
    "踩上脆冰就离开，让风把高度补回来。",
    "干净进入棱镜加速，不要在脆冰前浪费。",
    "先用回声做练习锚点，再把风接进棱镜。",
    "相信完整工具组：光继点、棱镜、脆冰和终点落地。"
  ];
  const ROOM_PURPOSES = [
    "信任跳跃弧线和安全落点",
    "冲进光继点，并尽早恢复",
    "先借弹簧高度，再花冲刺",
    "读清危险线后串联光继点",
    "练习折返路线和保底恢复",
    "用弹簧重置出口节奏",
    "脆冰上果断离开，借风回高度",
    "用棱镜加速选择脆冰路线",
    "先设回声锚点，再把风接进棱镜",
    "在终点压力下组合全部工具"
  ];
  const ROOM_ROUTE_LINES = [
    ["安全线：逐个平台稳定落点", "进阶线：每次落地后提前冲刺", "高手线：用 Spark 越过下方危险"],
    ["安全线：落稳后再触发光继点", "进阶线：保持冲刺速度触发", "高手线：把连锁带到补给前"],
    ["安全线：先弹簧，再过顶冲刺", "进阶线：短跳后直接接平台", "高手线：用 Spark 省掉低位等待"],
    ["安全线：把每个光继点当停顿", "进阶线：落地前连两次光继点", "高手线：带连锁穿过危险线"],
    ["安全线：折返时保留一次冲刺", "进阶线：用光继点进上层平台", "高手线：Wall Spark 进上层，不靠中段平台恢复"],
    ["安全线：弹簧重置出口节奏", "进阶线：弹簧前先穿过光继点", "高手线：一整句动作进入上出口"],
    ["安全线：脆冰只踩一下就走", "进阶线：用风代替中段落地", "高手线：风中不停顿接光继点"],
    ["安全线：站稳后再吃棱镜", "进阶线：过载穿过脆冰排", "高手线：Prism Spark 后再选棱镜路线"],
    ["安全线：连段前先点亮回声", "进阶线：风接棱镜再接光继点", "高手线：只在保 PB 时召回"],
    ["安全线：每次重置都明确花掉", "进阶线：棱镜穿中线", "高手线：完整工具组连到终点落地"]
  ];
  const ROOM_STYLE_TRIALS = [
    { kind: "precision", label: "落点精度", goal: "干净落点后用 Spark 越过危险", clean: true, tech: ["spark"], timeScale: 1.55 },
    { kind: "recovery", label: "恢复控制", goal: "触发光继后稳住下一次落点", clean: true, tech: ["relay"], timeScale: 1.45 },
    { kind: "timing", label: "弹簧节拍", goal: "弹簧给高度，Spark 省掉等待", clean: true, tech: ["spring", "spark"], timeScale: 1.5 },
    { kind: "chain", label: "连锁节奏", goal: "把三段光继连成一句动作", clean: false, tech: ["relayChain"], timeScale: 1.45 },
    { kind: "route", label: "路线选择", goal: "折返时用 Wall Spark 进上层路线", clean: true, tech: ["wallSpark"], timeScale: 1.45 },
    { kind: "exit", label: "出口节拍", goal: "光继接弹簧，把出口动作收干净", clean: true, tech: ["relay", "spring"], timeScale: 1.4 },
    { kind: "terrain", label: "地形风险", goal: "脆冰只借一步，立刻进风场", clean: false, tech: ["crumble", "updraft"], timeScale: 1.35 },
    { kind: "risk", label: "过载风险", goal: "棱镜过载后接 Prism Spark 穿过脆冰排", clean: false, tech: ["prism", "prismSpark", "crumble"], timeScale: 1.35 },
    { kind: "reading", label: "回声读图", goal: "先建回声锚点，再召回重接路线", clean: false, tech: ["echo", "recall"], timeScale: 1.55 },
    { kind: "endurance", label: "终盘耐压", goal: "光继、棱镜、脆冰连续收束到终点", clean: false, tech: ["relay", "prism", "crumble"], timeScale: 1.35 }
  ];
  const EXPERT_REQUIREMENTS = [
    ["spark"],
    ["relay"],
    ["spark", "spring"],
    ["relayChain"],
    ["wallSpark"],
    ["relay", "spring"],
    ["updraft", "crumble"],
    ["prism", "prismSpark", "crumble"],
    ["echo", "updraft", "prism"],
    ["relay", "prism", "crumble"]
  ];
  const EXPERT_REQUIREMENT_LABELS = {
    spark: "Spark",
    wallSpark: "Wall Spark",
    prismSpark: "Prism Spark",
    relay: "光继",
    relayChain: "连锁x3",
    spring: "弹簧",
    updraft: "风",
    prism: "棱镜",
    echo: "回声锚点",
    recall: "召回",
    crumble: "脆冰"
  };
  const LONG_TERM_CHALLENGES = [
    { id: "clear", label: "首登顶", goal: "完成一次完整路线", kind: "run", mode: "clean" },
    { id: "clean", label: "全 Clean", goal: "每房至少一次无失误", kind: "clean", mode: "clean" },
    { id: "pace", label: "全 S", goal: "每房 PB 达到 S 节奏", kind: "pace", mode: "pace" },
    { id: "style", label: "全 Style", goal: "每房完成类型挑战", kind: "style", mode: "style" },
    { id: "expert", label: "全 Expert", goal: "每房证明高手线", kind: "expert", mode: "expert" },
    { id: "nodeath", label: "零死亡登顶", goal: "完整通关且死亡数为 0", kind: "nodeath", mode: "clean" },
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
    { id: "wall-grace", room: 4, window: "WALL_COYOTE_TIME", maxDelay: 0.082, expected: ["wall"], note: "离墙后仍能墙跳修正" },
    { id: "aim-memory-dash", room: 2, window: "DASH_AIM_MEMORY", maxDelay: 0.07, expected: ["dash"], note: "松方向后保留上一冲刺意图" },
    { id: "spark-hop", room: 1, window: "SPARK_HOP_WINDOW", maxDelay: 0.09, expected: ["spark"], note: "dash 后续跃窗口是核心手感" },
    { id: "wall-spark", room: 5, window: "SPARK_HOP_WINDOW", maxDelay: 0.085, expected: ["wallSpark"], note: "贴墙续跃形成折返高手线" },
    { id: "prism-spark", room: 8, window: "SPARK_HOP_WINDOW", maxDelay: 0.085, expected: ["prismSpark"], note: "棱镜后续跃形成过载路线" }
  ];
  const TRAINING_TRANSITIONS = Object.freeze({
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

  const maps = [
    [
      "..............................",
      "..............................",
      "..............................",
      ".........................L....",
      "......................#####...",
      "..............................",
      ".................####.........",
      "..........................R...",
      "............####..............",
      "..............................",
      ".......####...................",
      "....................###.......",
      ".........................####.",
      ".............^^^^.............",
      ".............####.............",
      ".S......................^^^^..",
      "###########....###########...."
    ],
    [
      "..............................",
      "..............................",
      ".................L............",
      "..............#####...........",
      "..............................",
      ".....####.....................",
      "..........A...............R...",
      "......................####....",
      "..P...........................",
      "#####..............###........",
      ".........^^^^.................",
      ".........####.............L...",
      ".......................####...",
      "....####......................",
      "..................^^^^^^......",
      "..................######......",
      "....######################...."
    ],
    [
      "..............................",
      "..............................",
      "....................L.........",
      "...............#######........",
      "..............................",
      "....R.........................",
      "######...............####.....",
      "..............................",
      ".............P................",
      ".............#####............",
      ".........................L....",
      ".....####..............####...",
      "..............................",
      "..........^^^^^^..............",
      ".....####.######.......T......",
      "..............................",
      "##########################...."
    ],
    [
      "..............................",
      "..............................",
      ".....................L........",
      "..................#####.......",
      "..............................",
      "......A.......................",
      ".....####..............R......",
      "..............................",
      "..P.........A.................",
      "#####....#####.........####...",
      "..............................",
      ".............^^^^.............",
      ".............####.......A.....",
      "....................#####.....",
      "....####......................",
      ".........................####.",
      "#######################......."
    ],
    [
      "..............................",
      "..............................",
      ".............L................",
      "..........#####...............",
      "....................A.........",
      ".................####.........",
      "..............................",
      "..P......................R....",
      "#####.................####....",
      ".............A................",
      ".........####.................",
      "..............................",
      "....................^^^^^.....",
      "....................#####.....",
      "....A.........................",
      "....####..............####....",
      "#########........############."
    ],
    [
      "..............................",
      "..............................",
      "..............................",
      "....................L.........",
      ".................#####........",
      "..............................",
      "......A...................R...",
      ".....####.............####....",
      "..............................",
      "..P...........A...............",
      "#####......#####..............",
      "..........................A...",
      "........^^^^...........####...",
      "........####..................",
      "....................T.........",
      ".........................####.",
      "##############################"
    ],
    [
      "..............................",
      ".........................L....",
      "......................#####...",
      "..............................",
      ".............U................",
      ".........####.................",
      "..........................R...",
      ".......U..............####....",
      ".....CCC......................",
      ".....###......................",
      "..M..........U..........A.....",
      "#####......CCC##.......C###...",
      "..............................",
      "........^^^^..................",
      "........####..........U.......",
      "..............................",
      "###########################..."
    ],
    [
      "..............................",
      "........................L.....",
      ".....................#####....",
      ".................B............",
      "..............####............",
      "..............................",
      "......A.................R.....",
      ".....####............#####....",
      "..............................",
      "..P................A..........",
      "#####...CCCCC....CC###........",
      "..............................",
      "............^^^^..............",
      "............####..............",
      "....U..................CCCC...",
      "..............................",
      "##########################...."
    ],
    [
      "..............................",
      ".........................L....",
      ".....................#####....",
      "..............................",
      "......M.......................",
      ".....CCCC..............B......",
      "....................####..R...",
      "..P.......A...................",
      "#####....####.................",
      ".............U................",
      ".........CCCC###......CCCC....",
      "........................A.....",
      ".....B........^^^^.....####...",
      "....CCCC..............CCCC....",
      "....................U.........",
      ".........................####.",
      "#######################......."
    ],
    [
      "..............................",
      "..............................",
      "....................L.........",
      ".................#####........",
      ".............A................",
      "......A......B...........R....",
      ".....CCCC..CCCCC......CCCC....",
      "..............................",
      "..P.........U..........A......",
      "#####....CCC##................",
      "..............................",
      "............^^^^..............",
      "............####.......B......",
      "....M...............CCCCC.....",
      ".........A....................",
      ".........................H....",
      "##############################"
    ]
  ];

  const palette = {
    skyTop: "#172033",
    skyMid: "#294e64",
    skyLow: "#a06f5e",
    rock: "#31485b",
    rockDark: "#1a2939",
    rockLight: "#7892a0",
    snow: "#e7f4f7",
    hot: "#ff5c6c",
    gold: "#f7c65d",
    green: "#8fe39b",
    cyan: "#76d7ff",
    ink: "#f8fbff"
  };
  const ROOM_ATMOSPHERES = [
    { top: "#172033", mid: "#294e64", low: "#a06f5e", back: "#1e2d3f", midPeak: "#263d4c", front: "#45616a", haze: "#76d7ff", rim: "#f7c65d", moon: "#ffe7b4" },
    { top: "#131f36", mid: "#235168", low: "#8b7561", back: "#1a2b43", midPeak: "#244353", front: "#43636d", haze: "#76d7ff", rim: "#8fe39b", moon: "#d9f5ff" },
    { top: "#182139", mid: "#31515d", low: "#9b8065", back: "#223247", midPeak: "#334c59", front: "#5b6b70", haze: "#8fe39b", rim: "#fff0a0", moon: "#fff0c9" },
    { top: "#171b32", mid: "#37455d", low: "#91616f", back: "#20283f", midPeak: "#31364f", front: "#574c62", haze: "#ff8aa0", rim: "#76d7ff", moon: "#ffe2c9" },
    { top: "#121f2f", mid: "#254b53", low: "#716f5f", back: "#172c38", midPeak: "#274a4f", front: "#49645e", haze: "#8fe39b", rim: "#76d7ff", moon: "#d9fff0" },
    { top: "#1b2034", mid: "#3f4c58", low: "#9a6a5e", back: "#222d3d", midPeak: "#354450", front: "#625d66", haze: "#f7c65d", rim: "#ff9c62", moon: "#ffe7b4" },
    { top: "#101c31", mid: "#274c68", low: "#5f6d76", back: "#172b42", midPeak: "#27465d", front: "#3e6173", haze: "#76d7ff", rim: "#8fe39b", moon: "#d9f5ff" },
    { top: "#161931", mid: "#3c3d5f", low: "#755d72", back: "#22223f", midPeak: "#323356", front: "#5b5472", haze: "#f7c65d", rim: "#ff8aa0", moon: "#fff0a0" },
    { top: "#122231", mid: "#24545d", low: "#5d7668", back: "#173344", midPeak: "#26515a", front: "#47706a", haze: "#8fe39b", rim: "#f7c65d", moon: "#d9fff0" },
    { top: "#171728", mid: "#413452", low: "#8d5c62", back: "#221e35", midPeak: "#372f4c", front: "#66536c", haze: "#ff8aa0", rim: "#f7c65d", moon: "#fff0c9" }
  ];

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
  let gamepadHeld = new Set();
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
  const deathMarks = [];
  const deathReplays = [];
  const recentPath = [];
  const roomPath = [];
  let roomIndex = 0;
  let room = null;
  let started = false;
  let won = false;
  let lastTime = performance.now();
  let deathCount = 0;
  let deathReasons = createDeathReasons();
  let roomMistakes = createRoomCounters();
  let roomFocus = readRoomFocus();
  let roomAttemptClean = true;
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
  let grabLatched = false;
  let lastGrabHeld = false;
  let lastAimX = 1;
  let lastAimY = 0;
  let lastAimTimer = 0;
  let pathSampleTimer = 0;
  let relayChain = 0;
  let relayChainTimer = 0;
  let bestRelayChain = 0;
  let relayPopupTimer = 0;
  let roomBestFlashTimer = 0;
  let splitPopupTimer = 0;
  let splitPopupText = "";
  let splitPopupAhead = true;
  let feelCueTimer = 0;
  let feelCueMax = FEEL_CUE_TIME;
  let feelCueText = "";
  let feelCueDetail = "";
  let feelCueColor = palette.cyan;
  let routeCueTimer = ROUTE_CUE_TIME;
  let routeCueSlot = 0;
  let routeCueReason = "入场";
  let masteryPopupTimer = 0;
  let masteryPopupText = "";
  let masteryPopupDetail = "";
  let masteryPopupColor = palette.gold;
  let focusPopupTimer = 0;
  let focusPopupText = "";
  let focusPopupDetail = "";
  let deathCoachTimer = 0;
  let deathCoachText = "";
  let deathCoachDetail = "";
  let deathCoachAction = "";
  let deathCoachPlan = "";
  let deathCoachReason = "fall";
  let failureCueTimer = 0;
  let failureCueMax = FAILURE_REHEARSAL_TIME;
  let failureCueText = "";
  let failureCueDetail = "";
  let failureCueRoom = 0;
  let failureCueX = 0;
  let failureCueY = 0;
  let failureCueReason = "fall";
  let failureCueMode = "clean";
  let failureCuePath = [];
  let gameTipTimer = 0;
  let gameTipMax = GAME_TIP_TIME;
  let gameTipKind = "";
  let gameTipPriority = 0;
  let onboardingStep = 0;
  let focusResetConfirmUntil = 0;
  let focusResetExpiryTimer = 0;
  let lastGameStatus = "";
  let lastCoachSummary = "";
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
  let flowScore = 0;
  let flowPeak = 0;
  let flowTimer = 0;
  let flowPopupTimer = 0;
  let flowLabel = "";
  let nearMissCooldown = 0;
  let echoAnchor = null;
  let recallCooldown = 0;
  let recallPulseTimer = 0;
  let roomIntroTimer = ROOM_INTRO_TIME;
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
  const soundCooldowns = {};
  let timingArmed = false;
  let timingInputReady = false;
  let roomTech = createRoomTech();
  const settings = readSettings();
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
  let totalLumens = maps.reduce((total, rows) => {
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
  canvas.tabIndex = 0;
  refreshStartOverlay();

  window.addEventListener("keydown", (event) => {
    const uiControl = isSettingsInputTarget(event.target);
    const textEntry = isSettingsTextEntryTarget(event.target);
    if (settingsVisible && event.code === "Escape") {
      event.preventDefault();
      if (event.repeat) return;
      closeSettings();
      return;
    }
    if (textEntry) return;
    if (settingsVisible && event.code !== "KeyO" && event.code !== "F3") {
      return;
    }
    if (uiControl && event.code !== "KeyO" && event.code !== "F3") return;
    if (BLOCKED_CODES.has(event.code)) {
      event.preventDefault();
    }
    const firstPress = !keys.has(event.code);
    if (firstPress) {
      pressed.add(event.code);
      queueAction(event.code);
    }
    keys.add(event.code);
    if (event.code === "F3" && firstPress) {
      toggleDebug();
    }
    if (event.code === "KeyO" && firstPress) {
      toggleSettings();
    }
    if (!started && START_CODES.has(event.code)) {
      begin();
    }
    if (event.code === "KeyR" && firstPress && started) {
      if (won) {
        hardReset();
      } else {
        quickRetry();
      }
    } else if (won && event.code === "KeyR") {
      hardReset();
    }
    if (event.code === "KeyT" && firstPress && started && !won) {
      restartCurrentRoom();
    }
    if (RECALL_CODES.has(event.code) && firstPress && started && !won) {
      recallToAnchor();
    }
    if (debugVisible && firstPress && event.code.startsWith("Digit")) {
      const digit = Number(event.code.slice(5));
      const target = digit === 0 ? 9 : digit - 1;
      if (target >= 0 && target < maps.length) jumpToRoom(target);
    }
  });

  window.addEventListener("keyup", (event) => {
    if (isSettingsInputTarget(event.target)) return;
    keys.delete(event.code);
    if (isActionCode(event.code, "jump")) cutJump();
  });

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

  function configureCanvasBuffer() {
    const scale = Math.max(1, Math.min(1.25, window.devicePixelRatio || 1));
    const width = Math.round(W * scale);
    const height = Math.round(H * scale);
    if (canvas.width !== width || canvas.height !== height) {
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
    keys.clear();
    pressed.clear();
    touchPressed.clear();
    gamepadPressed.clear();
    gamepadHeld.clear();
    clearGrabToggle();
    for (const key of Object.keys(touch)) touch[key] = false;
    document.querySelectorAll("[data-touch]").forEach((button) => button.classList.remove("active"));
    player.jumpBuffer = 0;
    player.dashBuffer = 0;
    resetActionPulses();
  }

  canvas.addEventListener("pointerdown", focusGame);
  configureCanvasBuffer();
  window.addEventListener("resize", configureCanvasBuffer);
  startButton.addEventListener("click", begin);
  openTrainingButton?.addEventListener("click", openStartTrainingPanel);
  resumeTrainingButton?.addEventListener("click", resumeRecommendedTraining);
  if (new URLSearchParams(window.location.search).has("play")) {
    requestAnimationFrame(begin);
  }
  settingsButton?.addEventListener("click", toggleSettings);
  settingsCloseButton?.addEventListener("click", closeSettings);
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
  saveImportText?.addEventListener("input", () => {
    updateSaveImportPreview();
  });
  controlPresetSelect?.addEventListener("change", () => {
    settings.controlsPreset = CONTROL_PRESETS[controlPresetSelect.value] ? controlPresetSelect.value : "comfort";
    keys.clear();
    pressed.clear();
    touchPressed.clear();
    gamepadPressed.clear();
    gamepadHeld.clear();
    clearGrabToggle();
    resetActionPulses();
    writeSettings();
    focusGame();
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
  roomSelect?.addEventListener("change", () => {
    const target = Number(roomSelect.value);
    if (Number.isInteger(target) && target >= 0 && target < maps.length) {
      jumpToRoom(target);
      closeSettings();
    }
  });
  focusRoomButton?.addEventListener("click", () => {
    const target = recommendedPracticeRoom();
    if (target >= 0) {
      closeSettings();
      startRoomDrill(target);
    }
  });
  practicePriority?.addEventListener("click", () => {
    const target = recommendedPracticeRoom();
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
    setGameStatus("Focus 统计已清空");
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
  syncSettingsPanel();

  document.querySelectorAll("[data-touch]").forEach((button) => {
    const action = button.dataset.touch;
    const set = (value) => {
      const was = touch[action];
      touch[action] = value;
      button.classList.toggle("active", value);
      if (value && !was) {
        touchPressed.add(action);
        if (action === "jump") player.jumpBuffer = JUMP_BUFFER_TIME;
        if (action === "dash") player.dashBuffer = DASH_BUFFER_TIME;
        if (actionPulse[action] !== undefined) actionPulse[action] = ACTION_PULSE_TIME;
        if (!started) begin();
      } else if (!value && was && action === "jump") {
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
      dashes: 1,
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
    armRouteCue("入场", null, ROUTE_CUE_TIME);
  }

  function isGamePaused() {
    return settingsVisible && started && !won;
  }

  function seedHair() {
    player.hair = Array.from({ length: 7 }, (_, i) => ({
      x: player.x + player.w / 2 - i * player.facing * 4,
      y: player.y + 6 + i * 2
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
    setGameStatus(`挑战路线开始：${challenge.label} · ${challenge.goal}`);
    showGameTip(challenge.label, challenge.goal, "coach", GAME_TIP_TIME, 2);
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
        ? `R${target + 1} ${drillModeLabel(mode)}`
        : "Ready";
    }
    if (startButton) startButton.textContent = progress ? "路线" : "开始";
    if (resumeTrainingButton) {
      resumeTrainingButton.classList.toggle("hidden", !canResume);
      resumeTrainingButton.textContent = canResume ? `继续 R${target + 1} ${drillModeLabel(mode)}` : "继续训练";
      resumeTrainingButton.setAttribute("aria-hidden", String(!canResume));
    }
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
    settingsVisible = true;
    releaseAllInputs();
    syncSettingsVisibility();
    settingsPanel.scrollTop = 0;
    syncSettingsPanel();
    setGameStatus("训练面板已打开，开始前可先选 Drill");
    settingsCloseButton?.focus({ preventScroll: true });
  }

  function showGameTip(title, detail = "", kind = "coach", duration = GAME_TIP_TIME, priority = 1) {
    if (!gameTip || !gameTipTitle || !gameTipDetail) return;
    if (kind === "onboarding") return;
    if (kind === "coach" && priority <= 2) return;
    if (gameTipTimer > 0 && gameTipPriority > priority) return;
    const resolvedKind = GAME_TIP_CLASSES.includes(kind) ? kind : "coach";
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

  function beginnerFlowActive() {
    const entry = roomFocus[0] || createRoomFocusEntry();
    return started
      && !won
      && roomIndex === 0
      && !activeDrill
      && (bestRoomTimes[0] || 0) <= 0
      && (entry.clears || 0) <= 0;
  }

  function maybeStartBeginnerFlow() {
    onboardingStep = 2;
    clearGameTip("onboarding");
  }

  function showBeginnerCue(step) {
    onboardingStep = Math.max(onboardingStep, step + 1);
  }

  function updateOnboardingCues() {
    clearGameTip("onboarding");
  }

  function showBeginnerDeathTip(reason) {
    return reason;
  }

  function hardReset(options = {}) {
    collected = new Set();
    deathCount = 0;
    deathReasons = createDeathReasons();
    roomMistakes = createRoomCounters();
    roomAttemptClean = true;
    lastDeathReason = "none";
    crumbleSlipTimer = 0;
    clearFocusPopup();
    clearMasteryPopup();
    runTime = 0;
    roomTime = 0;
    timingArmed = false;
    timingInputReady = false;
    won = false;
    hitStopTimer = 0;
    shakeTimer = 0;
    shakeDuration = 0;
    shakePower = 0;
    ghosts.length = 0;
    lightTrails.length = 0;
    deathMarks.length = 0;
    deathReplays.length = 0;
    recentPath.length = 0;
    roomPath.length = 0;
    pathSampleTimer = 0;
    relayChain = 0;
    relayChainTimer = 0;
    relayPopupTimer = 0;
    roomBestFlashTimer = 0;
    clearSplitPopup();
    resetFlow();
    echoAnchor = null;
    recallCooldown = 0;
    recallPulseTimer = 0;
    nearMissCooldown = 0;
    clearDeathCoach();
    clearFailureRehearsal();
    clearGameTip();
    onboardingStep = 0;
    applyTrainingTransition("hardReset", {
      keepChallenge: Boolean(options.keepChallenge),
      keepRoute: Boolean(options.keepRoute),
      keepFeel: Boolean(options.keepFeel)
    });
    resetActionPulses();
    overlay.classList.add("hidden");
    resetToStart(0);
    refreshRoomSelectOptions();
    updateHud();
    maybeStartBeginnerFlow();
  }

  function jumpToRoom(index, options = {}) {
    collected = new Set();
    deathCount = 0;
    deathReasons = createDeathReasons();
    roomMistakes = createRoomCounters();
    roomAttemptClean = true;
    lastDeathReason = "none";
    crumbleSlipTimer = 0;
    clearFocusPopup();
    clearMasteryPopup();
    runTime = 0;
    roomTime = 0;
    timingArmed = false;
    timingInputReady = false;
    won = false;
    hitStopTimer = 0;
    ghosts.length = 0;
    lightTrails.length = 0;
    deathMarks.length = 0;
    deathReplays.length = 0;
    recentPath.length = 0;
    roomPath.length = 0;
    pathSampleTimer = 0;
    relayChain = 0;
    relayChainTimer = 0;
    relayPopupTimer = 0;
    roomBestFlashTimer = 0;
    clearSplitPopup();
    resetFlow();
    echoAnchor = null;
    recallCooldown = 0;
    recallPulseTimer = 0;
    nearMissCooldown = 0;
    clearDeathCoach();
    clearGameTip();
    onboardingStep = index === 0 ? 0 : 4;
    applyTrainingTransition("jumpRoom", {
      keepDrill: Boolean(options.keepDrill),
      keepChallenge: Boolean(options.keepChallenge),
      keepRoute: Boolean(options.keepRoute),
      keepFeel: Boolean(options.keepFeel)
    });
    if (!options.keepDrill) {
      clearFailureRehearsal();
    }
    resetActionPulses();
    overlay.classList.add("hidden");
    started = true;
    resetToStart(index);
    roomAttemptClean = true;
    seedHair();
    refreshRoomSelectOptions();
    updateHud();
    focusGame();
    maybeStartBeginnerFlow();
  }

  function clearTrainingTransitionState(options = {}) {
    if (!options.keepDrill) activeDrill = null;
    if (!options.keepChallenge) activeChallenge = null;
    if (!options.keepRoute) cancelActiveRouteContract(options.routeReason || "路线中断");
    if (!options.keepFeel) cancelActiveFeelFixture(options.feelReason || "校准中断");
  }

  function applyTrainingTransition(name, overrides = {}) {
    const base = TRAINING_TRANSITIONS[name] || {};
    clearTrainingTransitionState({ ...base, ...overrides });
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
    if (!started || won) {
      updateGamepad();
      if (!started && (gamepadPressed.has("jump") || gamepadPressed.has("dash"))) {
        begin();
      }
    }

    if (started && !won && !paused) {
      update(dt);
    } else {
      updateParticles(paused ? dt * 0.25 : dt);
      updateGhosts(paused ? 0 : dt);
      updateDeathMarks(paused ? 0 : dt);
      updateRelayChain(paused ? 0 : dt);
      if (paused) updateHud();
    }

    render(now / 1000);
    pressed.clear();
    touchPressed.clear();
    gamepadPressed.clear();
    requestAnimationFrame(frame);
  }

  function update(dt) {
    updateDeathMarks(dt);
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
      runTime += dt;
      roomTime += dt;
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
      player.dashes = 1;
      player.sparkHopTimer = 0;
      player.wallCoyote = 0;
      player.wallCoyoteDir = 0;
    }

    const wantsDash = player.dashBuffer > 0 && player.dashes > 0 && player.dashCooldown <= 0;
    if (wantsDash) {
      startDash(input);
    }

    if (player.dashTimer > 0) {
      player.dashTimer = Math.max(0, player.dashTimer - dt);
      player.ghostTimer -= dt;
      if (player.ghostTimer <= 0) {
        addGhost(0.34);
        player.ghostTimer = 0.032;
      }
      if (player.dashTimer <= 0) {
        player.vx *= 0.78;
        player.vy *= 0.62;
        armSparkHop();
      }
    } else {
      runGroundAir(input, dt);
      climb(input, dt);
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
      burst(player.x + player.w / 2, player.y + player.h, "#e9f7ff", 4, 90);
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
    updateOnboardingCues();
    updateHud();
  }

  function updateBuffers(dt) {
    updateGamepad();
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    player.dashBuffer = Math.max(0, player.dashBuffer - dt);

    if (justPressedAny(actionCodes("jump")) || touchPressed.has("jump") || gamepadPressed.has("jump")) {
      player.jumpBuffer = JUMP_BUFFER_TIME;
    }
    if (justPressedAny(actionCodes("dash")) || touchPressed.has("dash") || gamepadPressed.has("dash")) {
      player.dashBuffer = DASH_BUFFER_TIME;
    }
    if (gamepadPressed.has("recall") && started && !won) {
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
    if (player.jumpBuffer <= 0) return;
    const bufferedJump = player.jumpBuffer < JUMP_BUFFER_TIME - 0.026;

    if (player.coyote > 0 || player.wasGrounded) {
      const coyoteJump = !player.wasGrounded && player.coyote > 0;
      player.vy = -JUMP;
      player.jumpBuffer = 0;
      player.coyote = 0;
      addFlow(4, "jump");
      triggerActionVisual("jump", 0.2);
      if (coyoteJump) showFeelCue("COYOTE", "离地宽限命中", palette.gold);
      else if (bufferedJump) showFeelCue("BUFFER", "提前输入接住落地", palette.green);
      playSound("jump");
      shake(0.035, 1.1);
      burst(player.x + player.w / 2, player.y + player.h, "#e9f7ff", 8, 150);
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
      player.jumpBuffer = 0;
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
      burst(player.x + (wallJumpDir > 0 ? player.w : 0), player.y + player.h * 0.55, climbJump ? palette.green : "#e9f7ff", 9, 190);
    }
  }

  function sparkHop() {
    const quality = player.sparkHopTimer / SPARK_HOP_WINDOW;
    const dir = player.sparkHopDirX || player.facing;
    const variant = player.sparkHopVariant === "prismSpark" ? "prismSpark" : player.sparkHopVariant === "wallSpark" ? "wallSpark" : "spark";
    const xMult = variant === "wallSpark" ? WALL_SPARK_X_MULT : variant === "prismSpark" ? PRISM_SPARK_MULT : 1;
    const yMult = variant === "prismSpark" ? PRISM_SPARK_MULT : 1;
    if (dir !== 0) {
      player.vx = Math.sign(dir) * Math.max(Math.abs(player.vx), SPARK_HOP_X * xMult);
    }
    player.vy = Math.min(player.vy, -SPARK_HOP_Y * yMult);
    player.jumpBuffer = 0;
    player.sparkHopTimer = 0;
    player.sparkHopVariant = "spark";
    player.wallJumpLock = WALL_JUMP_LOCK_TIME;
    markRoomTech("spark");
    markRoomTech(variant);
    addFlow(12, "spark");
    triggerSparkVariantVisual(variant);
    showFeelCue(variant === "prismSpark" ? "PRISM SPARK" : variant === "wallSpark" ? "WALL SPARK" : quality > 0.45 ? "SPARK" : "LATE SPARK", variant === "prismSpark" ? "过载续跃命中" : variant === "wallSpark" ? "贴墙续跃转向" : quality > 0.45 ? "续跃窗口命中" : "压线续跃", variant === "prismSpark" || quality <= 0.45 ? palette.gold : palette.cyan, variant === "spark" ? FEEL_CUE_TIME : FEEL_CUE_TIME * 1.18);
    playSound(variant);
    hitStopTimer = Math.max(hitStopTimer, 0.012);
    burst(player.x + player.w / 2, player.y + player.h / 2, "#f8fbff", 12, 220);
    burst(player.x + player.w / 2, player.y + player.h, palette.cyan, 8, 180);
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
    player.dashes -= 1;
    player.dashTimer = DASH_TIME;
    player.dashCooldown = 0.07;
    player.dashDirX = dx;
    player.dashDirY = dy;
    player.sparkHopTimer = 0;
    player.ghostTimer = 0;
    player.dashBuffer = 0;
    player.coyote = 0;
    player.facing = dx === 0 ? player.facing : Math.sign(dx);
    addFlow(player.overdrive > 0 ? 8 : 5, player.overdrive > 0 ? "over" : "dash");
    triggerActionVisual("dash", 0.24);
    if (usedAimMemory) showFeelCue("AIM MEMORY", "沿用上一冲刺方向", palette.cyan, 0.54);
    playSound(player.overdrive > 0 ? "prism" : "dash");
    hitStopTimer = Math.max(hitStopTimer, DASH_HITSTOP);
    shake(0.08, 2.4);
    addGhost(0.48);
    spawnLightTrail(dx, dy);
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.cyan, 18, 330);
    const shardCount = settings.lowPerformance ? 4 : 7;
    for (let i = 0; i < shardCount; i++) {
      shards.push({
        x: player.x + player.w / 2 - dx * i * 8,
        y: player.y + player.h / 2 - dy * i * 5,
        life: 0.18 + i * 0.018,
        max: 0.22 + i * 0.018,
        r: 8 - i * 0.55
      });
    }
  }

  function updateEntities(dt, input) {
    const box = getPlayerBox();

    for (const lumen of room.entities.lumens) {
      if (!lumen.taken && distRectPoint(box, lumen.x, lumen.y) < 22) {
        lumen.taken = true;
        collected.add(lumen.id);
        addFlow(18, "lumen");
        playSound("refill", 0.65);
        burst(lumen.x, lumen.y, palette.gold, 22, 250);
      }
      lumen.bob += dt * 4;
    }

    for (const updraft of room.entities.updrafts) {
      updraft.bob += dt * 5.2;
      updraft.pulse = Math.max(0, updraft.pulse - dt);
      const field = {
        x: updraft.x - 10,
        y: Math.max(0, updraft.y - TILE * 2.4),
        w: updraft.w + 20,
        h: updraft.h + TILE * 0.9
      };
      if (aabb(box, field)) {
        markRoomTech("updraft");
        const center = field.x + field.w / 2;
        const pull = Math.max(-1, Math.min(1, (center - (player.x + player.w / 2)) / 34));
        const downResist = input.y > 0 ? 0.72 : 1;
        player.vy = Math.max(-UPDRAFT_RISE_SPEED, player.vy - UPDRAFT_FORCE * downResist * dt);
        player.vx += pull * 60 * dt;
        player.stamina = Math.min(MAX_STAMINA, player.stamina + 0.22 * dt);
        updraft.pulse = 0.26;
        if (Math.random() < 0.35) addSnow(center + (Math.random() - 0.5) * 26, field.y + field.h - 8, 1);
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
        player.dashes = 1;
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
        if (chain >= 3) markRoomTech("relayChain");
        relay.ready = false;
        relay.timer = RELAY_RESET_TIME;
        relay.pulse = Math.min(0.46, 0.24 + chain * 0.045);
        player.dashes = 1;
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
        player.overdrive = OVERDRIVE_TIME;
        player.dashes = 1;
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
        player.respawnRoom = roomIndex;
        player.respawnX = checkpoint.x - player.w / 2;
        player.respawnY = checkpoint.y + TILE / 2 - player.h;
        glow(checkpoint.x, checkpoint.y, palette.green);
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
          addFlow(10, "echo");
          triggerActionVisual("recall", 0.2);
          playSound("echo");
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
        player.dashes = 1;
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
      won = true;
      const isBest = result.isBest;
      overlay.innerHTML = `<h1>\u767b\u9876</h1><p class="finish-line">${formatTime(runTime)}${isBest ? "  BEST" : ""} \u00b7 D ${deathCount} \u00b7 Relay ${bestRelayChain} \u00b7 Flow ${Math.floor(flowPeak)}</p><p>${escapeHtml(masterySummary())}</p>${summitReviewCardsHtml()}<button class="primary" id="restartButton" type="button">\u518d\u6765</button>`;
      overlay.classList.remove("hidden");
      document.getElementById("restartButton").addEventListener("click", hardReset);
      bindFinishReviewActions();
      burst(room.entities.goal.x, room.entities.goal.y, palette.gold, 64, 420);
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
    const isNewRoomBest = recordRoomBest(roomIndex);
    markRoomClear(roomIndex);
    const drillMode = activeDrill && activeDrill.room === roomIndex ? activeDrill.mode : "";
    const drillResult = completeDrill(roomIndex, clearedClean);
    if (drillResult === false) return { isBest: false, drillResult };
    showMasteryPopup(roomIndex, masteryBefore, clearedClean, drillResult === true ? drillMode : "", isNewRoomBest);
    addFlow(120, "summit");
    recordSummitProfile();
    if (bestTime <= 0 || runTime < bestTime) {
      bestTime = runTime;
      writeBestTime(bestTime);
      return { isBest: true, drillResult };
    }
    return { isBest: false, drillResult };
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
    challengeBoardItems().forEach((item) => {
      if (item.done) profile.challengeWins[item.id] = true;
    });
    writeProfile();
  }

  function scoreRelayChain() {
    relayChain = relayChainTimer > 0 ? relayChain + 1 : 1;
    relayChainTimer = RELAY_CHAIN_TIME;
    relayPopupTimer = 0.68;
    bestRelayChain = Math.max(bestRelayChain, relayChain);
    return relayChain;
  }

  function updateRelayChain(dt) {
    relayChainTimer = Math.max(0, relayChainTimer - dt);
    relayPopupTimer = Math.max(0, relayPopupTimer - dt);
    if (relayChainTimer <= 0) relayChain = 0;
  }

  function resetRelayChain() {
    relayChain = 0;
    relayChainTimer = 0;
    relayPopupTimer = 0;
  }

  function addFlow(amount, label) {
    const chainBonus = flowTimer > 0 ? 1.18 : 1;
    flowScore = Math.min(999, flowScore + amount * chainBonus);
    flowPeak = Math.max(flowPeak, flowScore);
    if (flowPeak > bestFlow) {
      bestFlow = flowPeak;
      writeBestFlow(bestFlow);
    }
    flowTimer = FLOW_DECAY_TIME;
    flowPopupTimer = FLOW_POPUP_TIME;
    flowLabel = label;
  }

  function updateFlow(dt) {
    flowTimer = Math.max(0, flowTimer - dt);
    flowPopupTimer = Math.max(0, flowPopupTimer - dt);
    if (flowTimer <= 0 && flowScore > 0) {
      flowScore = Math.max(0, flowScore - FLOW_DECAY_RATE * dt);
    }
  }

  function resetFlow() {
    flowScore = 0;
    flowPeak = 0;
    flowTimer = 0;
    flowPopupTimer = 0;
    flowLabel = "";
  }

  function breakFlow() {
    flowScore = 0;
    flowTimer = 0;
    flowPopupTimer = 0;
    flowLabel = "";
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
    } catch {
      // Flow bests are optional practice data.
    }
  }

  function finiteNonNegativeNumber(value, fallback = 0, cap = 999999) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(cap, parsed));
  }

  function finiteNonNegativeInt(value, fallback = 0, cap = 999999) {
    return Math.floor(finiteNonNegativeNumber(value, fallback, cap));
  }

  function strictBoolean(value, fallback = false) {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return fallback;
  }

  function markStorageIssue(message) {
    storageHealthMessage = message;
  }

  function readStoredJson(key, fallback, normalize) {
    let parsed = fallback;
    let repaired = false;
    try {
      parsed = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      markStorageIssue("本地存档已修复");
      repaired = true;
      parsed = fallback;
      try {
        localStorage.removeItem(key);
      } catch {
        // Storage repair is best-effort.
      }
    }
    const normalized = normalize(parsed);
    if (repaired || JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      try {
        localStorage.setItem(key, JSON.stringify(normalized));
      } catch {
        markStorageIssue("本地存档不可写");
      }
    }
    return normalized;
  }

  function createProfile() {
    return {
      version: PROFILE_SCHEMA_VERSION,
      summitClears: 0,
      bestDeathCount: null,
      bestRelayChain: 0,
      bestFlowPeak: 0,
      lastClearTime: 0,
      lastClearAt: "",
      challengeWins: {}
    };
  }

  function normalizeProfile(saved) {
    const source = saved && typeof saved === "object" ? saved : {};
    const profileData = createProfile();
    profileData.version = PROFILE_SCHEMA_VERSION;
    profileData.summitClears = finiteNonNegativeInt(source.summitClears, 0, 9999);
    const savedBestDeath = source.bestDeathCount;
    const parsedBestDeath = Number(savedBestDeath);
    profileData.bestDeathCount = savedBestDeath === null || savedBestDeath === undefined || profileData.summitClears <= 0
      ? null
      : Number.isFinite(parsedBestDeath) ? finiteNonNegativeInt(parsedBestDeath, 0, 9999) : null;
    profileData.bestRelayChain = finiteNonNegativeInt(source.bestRelayChain, 0, 9999);
    profileData.bestFlowPeak = finiteNonNegativeNumber(source.bestFlowPeak, 0, 999);
    profileData.lastClearTime = finiteNonNegativeNumber(source.lastClearTime, 0, 36000);
    profileData.lastClearAt = typeof source.lastClearAt === "string" ? source.lastClearAt : "";
    const wins = source.challengeWins && typeof source.challengeWins === "object" ? source.challengeWins : {};
    LONG_TERM_CHALLENGES.forEach((challenge) => {
      if (strictBoolean(wins[challenge.id], false)) profileData.challengeWins[challenge.id] = true;
    });
    return profileData;
  }

  function readProfile() {
    return readStoredJson(PROFILE_KEY, {}, normalizeProfile);
  }

  function writeProfile() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Long-term profile data is optional and should not block play.
    }
  }

  function readRoomBests() {
    return readStoredJson(ROOM_BESTS_KEY, [], normalizeRoomBests);
  }

  function normalizeRoomBests(saved) {
    const source = Array.isArray(saved) ? saved : [];
    return maps.map((_, index) => {
      const value = Number(source[index]);
      return Number.isFinite(value) && value > 0 ? Math.min(3600, value) : 0;
    });
  }

  function writeRoomBests() {
    try {
      localStorage.setItem(ROOM_BESTS_KEY, JSON.stringify(bestRoomTimes));
    } catch {
      // Split times are optional practice data.
    }
  }

  function recordRoomBest(index) {
    if (roomTime <= 0) return false;
    const current = bestRoomTimes[index] || 0;
    const target = ROOM_TARGETS[index] || 0;
    const reference = current || target;
    const delta = reference > 0 ? roomTime - reference : 0;
    const isNewBest = current <= 0 || roomTime < current;
    showSplitPopup(index, roomTime, delta, isNewBest);
    if (!isNewBest) return false;
    bestRoomTimes[index] = roomTime;
    writeRoomBests();
    saveRoomPath(index);
    refreshRoomSelectOptions();
    roomBestFlashTimer = ROOM_BEST_FLASH_TIME;
    addFlow(42, "pb");
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.gold, 14, 210);
    return true;
  }

  function showSplitPopup(index, time, delta, isNewBest) {
    const grade = splitGrade(time, ROOM_TARGETS[index]);
    const label = isNewBest ? "PB" : "SPLIT";
    splitPopupText = `${label} ${formatDelta(delta)}${grade ? ` ${grade}` : ""}`;
    splitPopupAhead = delta <= 0 || isNewBest;
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
    const source = Array.isArray(saved) ? saved : [];
    return maps.map((_, index) => {
      const path = Array.isArray(source[index]) ? source[index] : [];
      return path.slice(0, MAX_ROOM_PATH_POINTS).map((point) => normalizeRoomPathPoint(point)).filter(Boolean);
    });
  }

  function normalizeRoomPathPoint(point) {
    if (!point || typeof point !== "object") return null;
    const x = Number(point.x);
    const y = Number(point.y);
    const t = Number(point.t);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      x: Math.max(-TILE, Math.min(W + TILE, Math.round(x * 10) / 10)),
      y: Math.max(-TILE, Math.min(H + TILE, Math.round(y * 10) / 10)),
      dash: strictBoolean(point.dash, false),
      spark: strictBoolean(point.spark, false),
      over: strictBoolean(point.over, false),
      t: Number.isFinite(t) && t > 0 ? Math.round(t * 1000) / 1000 : 0
    };
  }

  function writeRoomPaths() {
    try {
      localStorage.setItem(ROOM_PATHS_KEY, JSON.stringify(bestRoomPaths));
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
            player.dashes = 1;
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

  function resolveRoomTransition() {
    if (player.x > W + 3 && roomIndex < maps.length - 1) {
      const clearedRoom = roomIndex;
      const clearedClean = roomAttemptClean;
      const masteryBefore = roomMasteryScore(clearedRoom);
      const isNewRoomBest = recordRoomBest(clearedRoom);
      markRoomClear(clearedRoom);
      const drillMode = activeDrill && activeDrill.room === clearedRoom ? activeDrill.mode : "";
      const drillResult = completeDrill(clearedRoom, clearedClean);
      if (drillResult === false) return;
      showMasteryPopup(clearedRoom, masteryBefore, clearedClean, drillResult === true ? drillMode : "", isNewRoomBest);
      roomIndex += 1;
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
    addDeathMark(deathReason);
    showDeathCoach(deathReason);
    resetRelayChain();
    breakFlow();
    clearSplitPopup();
    player.deadTimer = DEATH_RETRY_TIME;
    crumbleSlipTimer = 0;
    hitStopTimer = Math.max(hitStopTimer, DEATH_HITSTOP);
    triggerActionVisual("death", 0.28);
    playSound(reason === "crumble" ? "crumble" : "death");
    shake(0.2, 6.4);
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.hot, 34, 360);
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
    player.jumpBuffer = 0;
    player.dashBuffer = 0;
    player.dashes = 1;
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
    if (failureCueTimer > 0 && failureCueRoom === roomIndex) {
      armRouteCue("修正", routeSlotForMode(failureCueMode), ROUTE_CUE_TIME);
    } else {
      armRouteCue("重试", null, ROUTE_CUE_TIME);
    }
    burst(player.x + player.w / 2, player.y + player.h / 2, "#f8fbff", 16, 230);
  }

  function quickRetry() {
    if (player.deadTimer > 0) return;
    const deathReason = registerDeath("retry");
    addDeathMark(deathReason);
    showDeathCoach(deathReason, "手动重开");
    resetRelayChain();
    breakFlow();
    hitStopTimer = 0;
    shake(0.08, 3.4);
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.hot, 18, 240);
    respawn();
  }

  function restartCurrentRoom() {
    if (player.deadTimer > 0) return;
    const deathReason = registerDeath("room");
    addDeathMark(deathReason);
    showDeathCoach(deathReason, "房间重开");
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
      dashes: 1,
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
    shards.length = 0;
    clearRecentPath();
    clearRoomPath();
    seedHair();
    resetActionVisuals();
    triggerActionVisual("spawn", 0.24);
    if (failureCueTimer > 0 && failureCueRoom === roomIndex) {
      armRouteCue("修正", routeSlotForMode(failureCueMode), ROUTE_CUE_TIME);
    } else {
      armRouteCue("重开", null, ROUTE_CUE_TIME);
    }
    burst(player.x + player.w / 2, player.y + player.h / 2, "#f8fbff", 12, 210);
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
    return DEATH_REASON_LABELS[normalizeDeathReason(reason)] || "FALL";
  }

  function deathReasonColor(reason) {
    const normalized = normalizeDeathReason(reason);
    if (normalized === "crumble") return palette.cyan;
    if (normalized === "retry" || normalized === "room") return palette.gold;
    return palette.hot;
  }

  function deathReasonSummary() {
    const parts = DEATH_REASON_KEYS
      .filter((key) => deathReasons[key] > 0)
      .map((key) => `${deathReasonLabel(key)} ${deathReasons[key]}`);
    return parts.length ? parts.join(" / ") : "clean";
  }

  function showDeathCoach(reason, title = "") {
    const normalized = normalizeDeathReason(reason);
    deathCoachReason = normalized;
    deathCoachText = title || deathReasonLabel(normalized);
    deathCoachDetail = roomCoachHint(roomIndex, normalized);
    deathCoachAction = deathPrescription(roomIndex, normalized);
    deathCoachPlan = deathCoachPlanText(roomIndex, normalized);
    deathCoachTimer = DEATH_COACH_TIME;
    setGameStatus(`${deathReasonLabel(normalized)}：${deathCoachAction}`);
    showFailureRehearsal(roomIndex, normalized, {
      title: title || `${deathReasonLabel(normalized)} 修正`,
      x: player.x + player.w / 2,
      y: player.y + player.h / 2
    });
    showBeginnerDeathTip(normalized);
    clearFocusPopup();
  }

  function clearDeathCoach() {
    deathCoachTimer = 0;
    deathCoachText = "";
    deathCoachDetail = "";
    deathCoachAction = "";
    deathCoachPlan = "";
    deathCoachReason = "fall";
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
    const entry = {
      schemaVersion: ROOM_FOCUS_SCHEMA_VERSION,
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
    DEATH_REASON_KEYS.forEach((key) => {
      entry[key] = 0;
    });
    return entry;
  }

  function normalizeRoomFocus(raw) {
    const source = Array.isArray(raw) ? raw : Array.isArray(raw?.rooms) ? raw.rooms : [];
    return maps.map((_, index) => {
      const saved = source[index] && typeof source[index] === "object" ? source[index] : {};
      const entry = createRoomFocusEntry();
      entry.schemaVersion = ROOM_FOCUS_SCHEMA_VERSION;
      entry.faults = finiteNonNegativeInt(saved.faults, 0, 9999);
      entry.clears = finiteNonNegativeInt(saved.clears, 0, 9999);
      entry.clean = finiteNonNegativeInt(saved.clean, 0, 9999);
      entry.drills = finiteNonNegativeInt(saved.drills, 0, 9999);
      entry.drillClears = finiteNonNegativeInt(saved.drillClears, 0, 9999);
      entry.drillClean = finiteNonNegativeInt(saved.drillClean, 0, 9999);
      entry.cleanDrills = finiteNonNegativeInt(saved.cleanDrills, 0, 9999);
      entry.cleanWins = finiteNonNegativeInt(saved.cleanWins, 0, 9999);
      entry.paceDrills = finiteNonNegativeInt(saved.paceDrills, 0, 9999);
      entry.paceWins = finiteNonNegativeInt(saved.paceWins, 0, 9999);
      entry.styleDrills = finiteNonNegativeInt(saved.styleDrills, 0, 9999);
      entry.styleWins = finiteNonNegativeInt(saved.styleWins, 0, 9999);
      entry.expertDrills = finiteNonNegativeInt(saved.expertDrills, 0, 9999);
      entry.expertWins = finiteNonNegativeInt(saved.expertWins, 0, 9999);
      entry.last = DEATH_REASON_LABELS[saved.last] ? saved.last : "none";
      DEATH_REASON_KEYS.forEach((key) => {
        entry[key] = finiteNonNegativeInt(saved[key], 0, 9999);
      });
      return entry;
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
    } catch {
      // Focus stats are optional practice data.
    }
  }

  function leadingRoomReason(entry) {
    let lead = "fall";
    let count = -1;
    DEATH_REASON_KEYS.forEach((key) => {
      if ((entry[key] || 0) > count) {
        lead = key;
        count = entry[key] || 0;
      }
    });
    return count > 0 ? lead : normalizeDeathReason(entry.last);
  }

  function trackRoomFault(reason) {
    const normalized = normalizeDeathReason(reason);
    const entry = roomFocus[roomIndex] || createRoomFocusEntry();
    roomMistakes[roomIndex] = (roomMistakes[roomIndex] || 0) + 1;
    entry.faults += 1;
    entry[normalized] = (entry[normalized] || 0) + 1;
    entry.last = normalized;
    roomFocus[roomIndex] = entry;
    roomAttemptClean = false;
    showFocusPopup(roomIndex, normalized);
    updatePracticeCoach();
    writeRoomFocus();
    refreshRoomSelectOptions();
  }

  function markRoomClear(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    entry.clears += 1;
    const clean = roomAttemptClean;
    if (clean) entry.clean += 1;
    roomFocus[index] = entry;
    roomAttemptClean = true;
    showClearPopup(index, clean);
    updatePracticeCoach();
    writeRoomFocus();
    refreshRoomSelectOptions();
  }

  function trackDrillStart(index, mode = "auto") {
    const entry = roomFocus[index] || createRoomFocusEntry();
    entry.drills += 1;
    if (mode === "clean") entry.cleanDrills += 1;
    if (mode === "pace") entry.paceDrills += 1;
    if (mode === "style") entry.styleDrills += 1;
    if (mode === "expert") entry.expertDrills += 1;
    roomFocus[index] = entry;
    writeRoomFocus();
    refreshRoomSelectOptions();
  }

  function trackDrillClear(index, clean, mode = "auto") {
    const entry = roomFocus[index] || createRoomFocusEntry();
    entry.drillClears += 1;
    if (clean) entry.drillClean += 1;
    if (mode === "clean") entry.cleanWins += 1;
    if (mode === "pace") entry.paceWins += 1;
    if (mode === "style") entry.styleWins += 1;
    if (mode === "expert") entry.expertWins += 1;
    roomFocus[index] = entry;
    writeRoomFocus();
    refreshRoomSelectOptions();
  }

  function showFocusPopup(index, reason) {
    const count = roomMistakes[index] || 0;
    focusPopupText = `FOCUS R${index + 1} ${deathReasonLabel(reason)} !${count}`;
    focusPopupDetail = roomCoachHint(index, reason);
    focusPopupTimer = FOCUS_POPUP_TIME;
  }

  function showClearPopup(index, clean) {
    const grade = splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]);
    focusPopupText = `${clean ? "CLEAN" : "CLEAR"} R${index + 1}${grade ? ` ${grade}` : ""}`;
    focusPopupDetail = index < maps.length - 1 ? `next: ${roomSkillLabel(index + 1)}` : "summit review ready";
    focusPopupTimer = Math.max(focusPopupTimer, FOCUS_POPUP_TIME * 0.72);
    playSound("clear", clean ? 1 : 0.75);
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

  function roomSkillShort(index) {
    const skills = ROOM_SKILLS[index] || [];
    return skills.length ? skills.slice(0, 2).map(skillLabel).join("+") : "路线";
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
    if (slot === 0) return "SAFE";
    if (slot === 2) return "EXPERT";
    return "FAST";
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
    if (slot === 0) return "先稳 clean";
    if (slot === 1) return "追 target";
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

  function showMasteryPopup(index, beforeScore, clean, drillMode = "", isNewBest = false) {
    const afterScore = roomMasteryScore(index);
    const delta = Math.max(0, afterScore - beforeScore);
    const level = roomMasteryLevel(afterScore);
    const grade = splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]);
    const nextStep = nextMasteryStepText(index);
    const wins = [];
    if (isNewBest) wins.push("PB");
    if (clean) wins.push("CLEAN");
    if (drillMode) wins.push(`${drillModeLabel(drillMode)} Drill`);
    if (!wins.length) wins.push("CLEAR");
    masteryPopupText = delta > 0 ? `R${index + 1} 掌握 +${delta}` : `R${index + 1} ${level} ${afterScore}`;
    masteryPopupDetail = `${level} ${afterScore}/100 · ${wins.join(" · ")}${grade ? ` · ${grade}` : ""} · ${nextStep}`;
    masteryPopupColor = delta > 0 ? palette.gold : clean ? palette.green : palette.cyan;
    masteryPopupTimer = MASTERY_POPUP_TIME;
    setGameStatus(`${masteryPopupText}：${masteryPopupDetail}`);
  }

  function clearMasteryPopup() {
    masteryPopupTimer = 0;
    masteryPopupText = "";
    masteryPopupDetail = "";
    masteryPopupColor = palette.gold;
  }

  function roomMedalLabel(index) {
    const best = bestRoomTimes[index] || 0;
    const target = ROOM_TARGETS[index] || 0;
    const grade = splitGrade(best, target);
    if (!best) return `T ${formatTime(target)}`;
    return `${grade || "PB"} ${formatTime(best)}`;
  }

  function roomCleanShort(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    if (entry.clean > 0) return `净${entry.clean}`;
    if (entry.clears > 0) return `通${entry.clears}`;
    return "未通";
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

  function roomPaceShort(index) {
    const best = bestRoomTimes[index] || 0;
    const target = ROOM_TARGETS[index] || 0;
    if (!best || !target) return "新";
    const delta = best - target;
    if (delta <= 0) return "达标";
    return formatDelta(delta);
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

  function deathPrescription(index, reason = "fall") {
    const normalized = normalizeDeathReason(reason);
    if (normalized === "spike") return `下一次：先停在安全格，冲刺方向避开危险线；${routeLineCore(index, 0)}`;
    if (normalized === "crumble") return `下一次：触冰只借一步，离开后再校正；${routeLineCore(index, 1)}`;
    if (normalized === "retry" || normalized === "room") return `下一次：只练开局第一句，确认输入后再提速；${routeLineCore(index, 0)}`;
    return `下一次：晚一点花冲刺，把落点留在视线中央；${routeLineCore(index, 0)}`;
  }

  function deathCoachPlanText(index, reason = "fall") {
    const normalized = normalizeDeathReason(reason);
    const mode = normalized === "spike" || normalized === "crumble" ? "clean" : resolveDrillMode(index);
    const target = `R${index + 1} ${drillModeLabel(mode)}`;
    return `建议 ${target}：${drillObjectiveForRoom(index, mode)}`;
  }

  function failureModeForReason(index, reason = "fall", mode = "") {
    if (mode) return resolveDrillMode(index, mode);
    const normalized = normalizeDeathReason(reason);
    if (normalized === "spike" || normalized === "fall" || normalized === "crumble") return "clean";
    return resolveDrillMode(index);
  }

  function failureRehearsalText(index, reason = "fall", mode = "") {
    const normalized = normalizeDeathReason(reason);
    const resolvedMode = failureModeForReason(index, normalized, mode);
    if (resolvedMode === "style") return `类型动作：${styleTrialObjective(index)}`;
    if (resolvedMode === "expert") return `高手动作：${expertRequirementText(index)} / ${routeLineCore(index, 2)}`;
    if (normalized === "spike") return `先停安全格 -> 再冲刺避线 / ${routeLineCore(index, 0)}`;
    if (normalized === "crumble") return `触冰只借一步 -> 离开后校正 / ${routeLineCore(index, 1)}`;
    if (normalized === "retry" || normalized === "room") return `只练开局第一句 -> 稳住后再提速 / ${routeLineCore(index, 0)}`;
    if (resolvedMode === "pace") return `晚半拍冲刺换落点 / ${routeLineCore(index, 1)}`;
    return `先确认落点 -> 冲刺留到危险线后 / ${routeLineCore(index, 0)}`;
  }

  function failureRehearsalPlanText(index, mode = "auto") {
    const resolvedMode = resolveDrillMode(index, mode);
    return `演练 ${drillModeLabel(resolvedMode)} Drill · ${routeSlotShort(routeSlotForMode(resolvedMode))}`;
  }

  function showFailureRehearsal(index, reason = "fall", options = {}) {
    const safeIndex = Math.max(0, Math.min(maps.length - 1, index));
    const normalized = normalizeDeathReason(reason);
    const mode = failureModeForReason(safeIndex, normalized, options.mode || "");
    failureCueRoom = safeIndex;
    failureCueReason = normalized;
    failureCueMode = mode;
    failureCueText = options.title || `${deathReasonLabel(normalized)} 修正 · ${drillModeLabel(mode)}`;
    failureCueDetail = options.detail || `${failureRehearsalText(safeIndex, normalized, mode)} / ${failureRehearsalPlanText(safeIndex, mode)}`;
    failureCueX = Number.isFinite(options.x) ? options.x : player.x + player.w / 2;
    failureCueY = Number.isFinite(options.y) ? options.y : player.y + player.h / 2;
    failureCuePath = captureFailureCuePath(safeIndex);
    failureCueMax = Math.max(0.8, options.duration || FAILURE_REHEARSAL_TIME);
    failureCueTimer = failureCueMax;
    armRouteCue(options.routeReason || "修正", routeSlotForMode(mode), Math.max(ROUTE_CUE_TIME, failureCueMax));
  }

  function captureFailureCuePath(index) {
    const points = recentPath
      .filter((point) => point.room === index)
      .slice(-34)
      .map((point) => ({
        x: point.x,
        y: point.y,
        dash: Boolean(point.dash),
        spark: Boolean(point.spark),
        over: Boolean(point.over)
      }));
    if (points.length >= 2) return points;
    return [
      { x: player.x + player.w / 2, y: player.y + player.h / 2 },
      { x: failureCueX, y: failureCueY }
    ];
  }

  function showDrillFailureRehearsal(drill, reason) {
    showFailureRehearsal(drill.room, "retry", {
      mode: drill.mode,
      title: `${drillModeLabel(drill.mode)} 未达标`,
      detail: `${reason} / ${failureRehearsalPlanText(drill.room, drill.mode)}`,
      routeReason: "重练",
      duration: FAILURE_REHEARSAL_TIME + 0.9
    });
  }

  function clearFailureRehearsal() {
    failureCueTimer = 0;
    failureCueMax = FAILURE_REHEARSAL_TIME;
    failureCueText = "";
    failureCueDetail = "";
    failureCueRoom = roomIndex;
    failureCueX = 0;
    failureCueY = 0;
    failureCueReason = "fall";
    failureCueMode = "clean";
    failureCuePath = [];
  }

  function failureCueActive() {
    return failureCueTimer > 0 && Boolean(failureCueText) && failureCueRoom === roomIndex;
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
    if (current > 0) return `本轮 !${current}`;
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
    return current * 4 + Math.max(0, entry.faults - entry.clean * 2);
  }
  function roomSelectFocusLabel(index) {
    const current = roomMistakes[index] || 0;
    if (current > 0) return ` / !${current}`;
    const entry = roomFocus[index] || createRoomFocusEntry();
    const pressure = entry.faults - entry.clean * 2;
    if (entry.faults >= 3 && pressure > 0) {
      return ` / watch ${deathReasonLabel(leadingRoomReason(entry)).slice(0, 3)}`;
    }
    return "";
  }

  function roomFocusDetails(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    const current = roomMistakes[index] || 0;
    const lead = leadingRoomReason(entry);
    const run = current > 0 ? `run !${current}` : "run clean";
    const saved = entry.faults > 0 ? `saved ${deathReasonLabel(lead)} ${entry[lead] || 0}/${entry.faults}` : "saved clean";
    const clears = entry.clears > 0 ? `clean ${entry.clean}/${entry.clears}` : "clean 0/0";
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
    const detail = current > 0 ? `!${current}` : `score ${focus.score}`;
    return ` / Focus R${focus.index + 1} ${deathReasonLabel(focus.reason)} ${detail}`;
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

  function expertRequirementProgress(index) {
    const requirements = expertRequirementsForRoom(index);
    if (!requirements.length) return "";
    const done = requirements.filter((key) => roomTech[key]).length;
    return `动作 ${done}/${requirements.length}`;
  }

  function styleTrialProgress(index) {
    const requirements = styleTrialTech(index);
    if (!requirements.length) return "";
    const done = requirements.filter((key) => roomTech[key]).length;
    return `类型 ${done}/${requirements.length}`;
  }

  function drillHudDetailText(drill, index) {
    if (!drill || drill.room !== index) return "";
    if (drill.mode === "style") {
      const limit = styleTrialTimeLimit(index);
      const time = limit > 0 ? ` / 剩 ${formatTime(Math.max(0, limit - roomTime))}` : "";
      return `${styleTrialProgress(index)}${time}`;
    }
    if (drill.mode === "expert") {
      const target = ROOM_TARGETS[index] || 0;
      const time = target > 0 ? ` / S 剩 ${formatTime(Math.max(0, target - roomTime))}` : "";
      return `${expertRequirementProgress(index)}${time}`;
    }
    if (drill.mode === "pace") {
      const target = ROOM_TARGETS[index] || 0;
      return target > 0 ? `剩 ${formatTime(Math.max(0, target - roomTime))}` : "";
    }
    return "";
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

  function startRoomDrill(index, mode = "auto", options = {}) {
    const resolvedMode = resolveDrillMode(index, mode);
    const objective = drillObjectiveForRoom(index, resolvedMode);
    if (!options.keepRoute) cancelActiveRouteContract("改练中断");
    if (options.feelFixture && activeFeelFixture && activeFeelFixture.id !== options.feelFixture) cancelActiveFeelFixture("改练中断");
    if (!options.keepFeel && !options.feelFixture) cancelActiveFeelFixture("改练中断");
    jumpToRoom(index, { keepDrill: true, keepRoute: Boolean(options.keepRoute), keepFeel: Boolean(options.keepFeel || options.feelFixture) });
    clearFailureRehearsal();
    activeDrill = { room: index, mode: resolvedMode, objective, target: ROOM_TARGETS[index] || 0 };
    if (options.feelFixture) activeFeelFixture = { id: options.feelFixture, room: index, mode: resolvedMode };
    armRouteCue("Drill", routeSlotForMode(resolvedMode), ROUTE_CUE_TIME + 1.2);
    trackDrillStart(index, resolvedMode);
    focusPopupText = `${drillModeLabel(resolvedMode)} DRILL R${index + 1}`;
    focusPopupDetail = `${drillTargetText(index, resolvedMode)} / ${objective}`;
    focusPopupTimer = FOCUS_POPUP_TIME;
    setGameStatus(`${drillModeLabel(resolvedMode)} Drill R${index + 1}：${objective}`);
    updatePracticeCoach();
  }

  function completeDrill(index, clean) {
    if (!activeDrill || activeDrill.room !== index) return null;
    const success = drillSucceeded(activeDrill, clean, roomTime);
    if (success) {
      const mode = activeDrill.mode;
      trackDrillClear(index, clean, mode);
      const stats = drillContractStats(index, mode);
      focusPopupText = `${clean ? "DRILL 无失误" : "DRILL 通过"} R${index + 1}`;
      focusPopupDetail = `${drillContractStatus(stats)} / ${roomMasteryLevel(roomMasteryScore(index))} ${roomMasteryScore(index)} / ${nextMasteryStepText(index)}`;
      focusPopupTimer = FOCUS_POPUP_TIME;
      armRouteCue("完成", routeSlotForMode(mode), ROUTE_CUE_TIME * 0.72);
      clearFailureRehearsal();
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
    showDrillFailureRehearsal(drill, reason);
    playSound("ui", 0.8);
    setGameStatus(`${drillModeLabel(drill.mode)} Drill 重练：${reason}`);
    updatePracticeCoach();
  }

  function drillSucceeded(drill, clean, elapsed) {
    if (drill.mode === "clean") return clean;
    if (drill.mode === "pace") return drill.target > 0 && elapsed <= drill.target;
    if (drill.mode === "style") return styleTrialSucceeded(drill.room, clean, elapsed);
    if (drill.mode === "expert") return clean && drill.target > 0 && elapsed <= drill.target && expertRequirementsMet(drill.room);
    return true;
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

  function activeDrillText(index) {
    if (!activeDrill || activeDrill.room !== index) return "";
    const current = roomMistakes[index] || 0;
    const progress = activeDrill.mode === "expert"
      ? expertRequirementProgress(index)
      : activeDrill.mode === "style"
        ? styleTrialProgress(index)
        : "";
    return `${drillModeLabel(activeDrill.mode)} / ${activeDrill.objective}${progress ? ` / ${progress}` : ""}${current ? ` / !${current}` : ""}`;
  }

  function practiceCoachText() {
    if (activeDrill && activeDrill.room === roomIndex) {
      return `${drillModeLabel(activeDrill.mode)} R${activeDrill.room + 1} · ${activeDrill.objective}${roomMistakes[activeDrill.room] ? ` · !${roomMistakes[activeDrill.room]}` : ""}`;
    }
    const target = recommendedPracticeRoom();
    const entry = roomFocus[target] || createRoomFocusEntry();
    const reason = entry.faults > 0 ? leadingRoomReason(entry) : "fall";
    const score = roomFocusScore(target);
    const mode = resolveDrillMode(target);
    const marker = score > 0 ? `复盘 ${deathReasonLabel(reason)} ${score}` : `${drillModeLabel(mode)} 合同`;
    return `${marker} / ${roomTrainingAdvice(target)}`;
  }

  function updatePracticeCoach() {
    const text = practiceCoachText();
    if (coachSummary && text !== lastCoachSummary) {
      coachSummary.textContent = text;
      lastCoachSummary = text;
    }
    if (focusRoomButton) {
      const target = recommendedPracticeRoom();
      const mode = resolveDrillMode(target);
      const label = `R${target + 1} ${drillModeLabel(mode)}`;
      if (focusRoomButton.textContent !== label) focusRoomButton.textContent = label;
      focusRoomButton.title = `${drillTargetText(target, mode)} / ${drillObjectiveForRoom(target, mode)}`;
    }
    updatePracticePriority();
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

  function updatePracticePriority() {
    if (!practicePriority || !settingsVisible) return;
    const target = recommendedPracticeRoom();
    const mode = resolveDrillMode(target);
    const stats = drillContractStats(target, mode);
    const progress = drillContractProgress(stats);
    const title = `R${target + 1} ${ROOM_NAMES[target] || "Summit"} · ${drillModeLabel(mode)}`;
    const detail = `${drillTargetText(target, mode)} / ${drillObjectiveForRoom(target, mode)}`;
    practicePriority.classList.remove("clean", "pace", "style", "expert");
    practicePriority.classList.add(mode);
    practicePriority.style.setProperty("--priority-progress", `${progress}%`);
    practicePriority.title = detail;
    practicePriority.innerHTML = `<span>下一步 · ${escapeHtml(drillContractStatus(stats))}</span>`
      + `<strong>${escapeHtml(title)}</strong>`
      + `<em>${escapeHtml(detail)}</em>`
      + `<i class="priority-meter" aria-hidden="true"></i>`;
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

  function chapterGrade(percent) {
    if (percent >= 92) return "SS";
    if (percent >= 78) return "S";
    if (percent >= 62) return "A";
    if (percent >= 42) return "B";
    if (percent >= 20) return "C";
    return "D";
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

  function routeContractById(id) {
    return ROUTE_CONTRACTS.find((contract) => contract.id === id) || ROUTE_CONTRACTS[0];
  }

  function rejectTrainingEntry(label) {
    setGameStatus(`${label} 入口失效，请刷新页面后重试`);
    showGameTip("训练入口失效", "请刷新页面后重新打开训练驾驶舱", "death", GAME_TIP_TIME, 3);
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
    const contract = routeContractById(activeRouteContract.id);
    const stepIndex = Math.max(0, Math.min(contract.steps.length - 1, activeRouteContract.step || 0));
    const step = contract.steps[stepIndex];
    lastRouteContractResult = {
      id: contract.id,
      label: contract.label,
      done: false,
      step: stepIndex,
      detail: step ? `${reason}：停在 ${stepIndex + 1}/${contract.steps.length} ${routeContractStepLabel(step)}` : reason
    };
    activeRouteContract = null;
    nextRouteContractGeneration();
    return true;
  }

  function activeRouteContractData() {
    if (!activeRouteContract) return null;
    const contract = routeContractById(activeRouteContract.id);
    const stepIndex = Math.max(0, Math.min(contract.steps.length - 1, activeRouteContract.step));
    const step = contract.steps[stepIndex];
    if (!step) return null;
    return { contract, step, stepIndex, total: contract.steps.length };
  }

  function routeContractMatchesDrill(drill) {
    const data = activeRouteContractData();
    return Boolean(data && drill && data.step.index === drill.room && resolveDrillMode(data.step.index, data.step.mode) === drill.mode);
  }

  function routeContractHudDetail(index, mode) {
    const data = activeRouteContractData();
    if (!data || data.step.index !== index || data.step.mode !== mode) return "";
    const next = data.contract.steps[data.stepIndex + 1];
    return `航线 ${data.stepIndex + 1}/${data.total} ${data.contract.label}${next ? ` -> ${routeContractStepLabel(next)}` : " -> 收束"}`;
  }

  function routeContractSummaryText() {
    const active = activeRouteContractData();
    if (active) return `航线 ${active.contract.label} ${active.stepIndex + 1}/${active.total}：${routeContractStepLabel(active.step)}`;
    if (lastRouteContractResult) return lastRouteContractResult.done
      ? `航线 ${lastRouteContractResult.label} 已完成`
      : `航线 ${lastRouteContractResult.label} 可继续`;
    const next = ROUTE_CONTRACTS.find((contract) => routeContractProgress(contract) < 100) || ROUTE_CONTRACTS[0];
    return `航线建议 ${next.label} ${routeContractProgress(next)}%`;
  }

  function routeContractResumeStep(contract) {
    if (!lastRouteContractResult || lastRouteContractResult.done || lastRouteContractResult.id !== contract.id) return -1;
    const step = Number(lastRouteContractResult.step);
    return Number.isInteger(step) ? Math.max(0, Math.min(contract.steps.length - 1, step)) : 0;
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
    const step = Math.max(0, Math.min(contract.steps.length - 1, Number(stepIndex) || 0));
    activeRouteContract = { id: contract.id, step, generation: nextRouteContractGeneration() };
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
    const contract = routeContractById(activeRouteContract.id);
    const step = contract.steps[activeRouteContract.step];
    if (!step) {
      activeRouteContract = null;
      return;
    }
    startRoomDrill(step.index, step.mode, { keepRoute: true });
    focusPopupText = `${contract.label} ${activeRouteContract.step + 1}/${contract.steps.length}`;
    focusPopupDetail = `${routeContractStepLabel(step)} / ${drillObjectiveForRoom(step.index, step.mode)}`;
    focusPopupTimer = FOCUS_POPUP_TIME;
    setGameStatus(`${contract.label}：${routeContractStepLabel(step)}`);
  }

  function advanceRouteContract(index, mode) {
    if (!activeRouteContract) return false;
    const contract = routeContractById(activeRouteContract.id);
    const step = contract.steps[activeRouteContract.step];
    if (!step || step.index !== index || resolveDrillMode(index, step.mode) !== mode) return false;
    activeRouteContract.step += 1;
    const next = contract.steps[activeRouteContract.step];
    if (!next) {
      focusPopupText = `${contract.label} 完成`;
      focusPopupDetail = contract.goal;
      focusPopupTimer = FOCUS_POPUP_TIME;
      lastRouteContractResult = { id: contract.id, label: contract.label, done: true, detail: contract.goal };
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

  function feelFixtureById(id) {
    return FEEL_REPLAY_FIXTURES.find((fixture) => fixture.id === id) || FEEL_REPLAY_FIXTURES[0];
  }

  function findFeelFixtureById(id) {
    return FEEL_REPLAY_FIXTURES.find((fixture) => fixture.id === id) || null;
  }

  function feelFixtureMode(fixture) {
    const expected = Array.isArray(fixture.expected) ? fixture.expected : [];
    if (expected.includes("prismSpark")) return "style";
    if (expected.includes("wallSpark")) return "style";
    if (expected.includes("spark")) return "style";
    if (expected.includes("dash")) return "pace";
    return "clean";
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
    return Boolean(activeFeelFixture && drill && activeFeelFixture.room === drill.room && activeFeelFixture.mode === drill.mode);
  }

  function cancelActiveFeelFixture(reason = "已中断") {
    if (!activeFeelFixture) return false;
    const fixture = feelFixtureById(activeFeelFixture.id);
    lastFeelFixtureResult = {
      id: fixture.id,
      done: false,
      detail: `${reason}：${fixture.note}`
    };
    activeFeelFixture = null;
    return true;
  }

  function completeActiveFeelFixture(index, mode, clean, elapsed) {
    if (!activeFeelFixture || activeFeelFixture.room !== index || activeFeelFixture.mode !== mode) return false;
    const fixture = feelFixtureById(activeFeelFixture.id);
    lastFeelFixtureResult = {
      id: fixture.id,
      done: true,
      detail: `${fixture.note} / ${formatTime(elapsed)}${clean ? " / 无失误" : ""}`
    };
    activeFeelFixture = null;
    return true;
  }

  function feelFixtureStatusText(fixture, fallback) {
    if (activeFeelFixture && activeFeelFixture.id === fixture.id) return "进行中";
    if (lastFeelFixtureResult && lastFeelFixtureResult.id === fixture.id) return lastFeelFixtureResult.done ? "刚完成" : "已中断";
    return fallback;
  }

  function feelFixtureDetailText(fixture) {
    if (activeFeelFixture && activeFeelFixture.id === fixture.id) return `当前校准：${fixture.note}`;
    if (lastFeelFixtureResult && lastFeelFixtureResult.id === fixture.id) return lastFeelFixtureResult.detail;
    return fixture.note;
  }

  function feelFixtureCardClass(fixture) {
    if (activeFeelFixture && activeFeelFixture.id === fixture.id) return "active";
    if (lastFeelFixtureResult && lastFeelFixtureResult.id === fixture.id) return lastFeelFixtureResult.done ? "recent" : "interrupted";
    return "";
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
    showGameTip("手感校准", fixture.note, "coach", GAME_TIP_TIME, 2);
    setGameStatus(`手感校准 ${fixture.id}：${fixture.note}`);
    return true;
  }

  function updateDrillVariantButtons() {
    const target = practiceTargetRoom();
    if (drillCleanButton) {
      drillCleanButton.textContent = "Clean";
      drillCleanButton.title = `${drillTargetText(target, "clean")} / ${drillObjectiveForRoom(target, "clean")}`;
    }
    if (drillPaceButton) {
      drillPaceButton.textContent = "Pace";
      drillPaceButton.title = `${drillTargetText(target, "pace")} / ${drillObjectiveForRoom(target, "pace")}`;
    }
    if (drillStyleButton) {
      drillStyleButton.textContent = "Style";
      drillStyleButton.title = `${drillTargetText(target, "style")} / ${drillObjectiveForRoom(target, "style")}`;
      drillStyleButton.classList.add("style");
    }
    if (drillExpertButton) {
      drillExpertButton.textContent = "Expert";
      drillExpertButton.title = `${drillTargetText(target, "expert")} / ${drillObjectiveForRoom(target, "expert")}`;
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
        reason: "追 target",
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
    if (mode === "clean") return { starts: entry.cleanDrills, wins: entry.cleanWins };
    if (mode === "pace") return { starts: entry.paceDrills, wins: entry.paceWins };
    if (mode === "style") return { starts: entry.styleDrills, wins: entry.styleWins };
    if (mode === "expert") return { starts: entry.expertDrills, wins: entry.expertWins };
    return { starts: entry.drills, wins: entry.drillClears };
  }

  function drillContractStatus(stats) {
    if (stats.wins > 0) return `完成 ${stats.wins}/${stats.starts}`;
    if (stats.starts > 0) return `尝试 ${stats.wins}/${stats.starts}`;
    return "未开练";
  }

  function drillContractProgress(stats) {
    if (stats.starts <= 0) return 0;
    return Math.round(Math.max(0, Math.min(1, stats.wins / stats.starts)) * 100);
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
    return {
      id: challenge.id,
      kind: challenge.kind,
      label: challenge.label,
      goal: challenge.goal,
      startBestFlow: Math.floor(Math.max(bestFlow, profile.bestFlowPeak || 0))
    };
  }

  function activeChallengeState() {
    if (!activeChallenge) return null;
    const challenge = challengeById(activeChallenge.id);
    const targetRooms = maps.length;
    const reachedRooms = won ? targetRooms : Math.max(0, Math.min(targetRooms, roomIndex));
    let current = reachedRooms;
    let target = targetRooms;
    let detail = won ? "完整路线已结束" : `当前 R${roomIndex + 1}/${targetRooms}`;
    let failed = false;
    let done = won;

    if (challenge.kind === "nodeath") {
      failed = deathCount > 0;
      done = won && deathCount === 0;
      detail = failed ? `已破 D ${deathCount}，继续完成可保留复盘` : `D 0 · 当前 R${roomIndex + 1}/${targetRooms}`;
    } else if (challenge.kind === "flow") {
      current = Math.floor(Math.max(0, flowPeak));
      target = FLOW_CHALLENGE_TARGET;
      done = current >= target;
      detail = `本轮 ${current}/${target} · 历史 Best ${Math.floor(Math.max(bestFlow, profile.bestFlowPeak || 0))}`;
    }

    const progress = target > 0 ? Math.round(Math.max(0, Math.min(1, current / target)) * 100) : 0;
    return {
      ...challenge,
      current,
      target,
      progress,
      detail,
      failed,
      done,
      status: done ? "达成" : failed ? "已破" : won ? "未达成" : "进行中"
    };
  }

  function activeChallengeReview() {
    const state = activeChallengeState();
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

  function challengeTargetRoom(challenge) {
    if (challenge.kind === "clean" || challenge.kind === "nodeath") return cleanPracticeRoom();
    if (challenge.kind === "pace" || challenge.kind === "flow") return pacePracticeRoom();
    if (challenge.kind === "style") return stylePracticeRoom();
    if (challenge.kind === "expert") return expertPracticeRoom();
    return recommendedPracticeRoom();
  }

  function challengeProgress(challenge) {
    const roomTotal = maps.length;
    let current = 0;
    let target = 1;
    let detail = challenge.goal;
    if (challenge.kind === "run") {
      current = profile.summitClears > 0 || bestTime > 0 ? 1 : 0;
      detail = current ? `已登顶 ${profile.summitClears || 1} 次` : "从 R1 开始完整通关";
    } else if (challenge.kind === "clean") {
      current = cleanRoomCount();
      target = roomTotal;
      detail = `Clean ${current}/${target}`;
    } else if (challenge.kind === "pace") {
      current = sRankRoomCount();
      target = roomTotal;
      detail = `S ${current}/${target}`;
    } else if (challenge.kind === "style") {
      current = styleWinRoomCount();
      target = roomTotal;
      detail = `Style ${current}/${target}`;
    } else if (challenge.kind === "expert") {
      current = expertWinRoomCount();
      target = roomTotal;
      detail = `Expert ${current}/${target}`;
    } else if (challenge.kind === "nodeath") {
      current = profile.bestDeathCount === 0 ? 1 : 0;
      detail = profile.bestDeathCount === null ? "未记录完整通关死亡数" : `最佳 D ${profile.bestDeathCount}`;
    } else if (challenge.kind === "flow") {
      current = Math.min(FLOW_CHALLENGE_TARGET, Math.max(bestFlow, profile.bestFlowPeak || 0));
      target = FLOW_CHALLENGE_TARGET;
      detail = `Flow Best ${Math.floor(Math.max(bestFlow, profile.bestFlowPeak || 0))}/${target}`;
    }
    const progress = target > 0 ? Math.round(Math.max(0, Math.min(1, current / target)) * 100) : 0;
    const done = progress >= 100;
    if (done) profile.challengeWins[challenge.id] = true;
    return {
      current,
      target,
      progress,
      done,
      detail,
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
    writeProfile();
  }

  function updateProfileSummary() {
    if (!profileSummary || !settingsVisible) return;
    const data = chapterCompletionData();
    const challengeWins = challengeBoardItems().filter((item) => item.done).length;
    const bestDeath = profile.bestDeathCount === null ? "未记录" : `D ${profile.bestDeathCount}`;
    const html = `<div class="profile-head"><span>长期档案</span><strong>${escapeHtml(chapterGrade(data.percent))} · ${data.percent}%</strong></div>`
      + `<div class="profile-grid">`
      + `<span><b>${profile.summitClears}</b><em>登顶</em></span>`
      + `<span><b>${escapeHtml(bestDeath)}</b><em>最佳死亡</em></span>`
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
    let score = 0;
    if (best > 0) score += 18;
    if (entry.clean > 0) score += 24;
    if (grade === "S") score += 26;
    else if (grade === "A") score += 20;
    else if (grade === "B") score += 13;
    else if (grade === "C") score += 7;
    if (entry.expertWins > 0) score += 22;
    else if (entry.styleWins > 0) score += 18;
    else if (entry.paceWins > 0) score += 15;
    else if (entry.cleanWins > 0) score += 9;
    score -= Math.min(18, roomFocusScore(index) * 2);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function roomMasteryLevel(score) {
    if (score >= 86) return "掌握";
    if (score >= 66) return "稳定";
    if (score >= 42) return "成形";
    if (score >= 18) return "可通";
    return "待练";
  }

  function roomReviewMode(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    const loss = roomSplitLoss(index);
    const pressure = roomFocusScore(index);
    const grade = splitGrade(bestRoomTimes[index] || 0, ROOM_TARGETS[index]);
    if (entry.clean <= 0 || pressure >= 8) return "clean";
    if (loss === null || loss > 0 || grade !== "S") return "pace";
    if (entry.styleWins <= 0) return "style";
    if (entry.expertWins <= 0) return "expert";
    return "expert";
  }

  function roomReviewPriority(index) {
    const entry = roomFocus[index] || createRoomFocusEntry();
    const loss = roomSplitLoss(index);
    let score = roomFocusScore(index) * 8;
    if (!(bestRoomTimes[index] > 0)) score += 80;
    if (entry.clean <= 0) score += 46;
    if (loss === null) score += 26;
    else if (loss > 0) score += 24 + Math.min(42, loss * 5);
    if (entry.paceWins <= 0) score += 12;
    if (entry.styleWins <= 0) score += 10;
    if (entry.expertWins <= 0) score += 8;
    return score + (maps.length - index) * 0.01;
  }

  function practiceLedgerRows() {
    return maps.map((_, index) => {
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
    }).sort((a, b) => b.priority - a.priority);
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
        const focus = roomFocusScore(row.index) > 0 ? ` · Focus ${deathReasonLabel(leadingRoomReason(entry))}` : "";
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
    clearFailureRehearsal();
    writeRoomFocus();
    refreshRoomSelectOptions();
    updatePracticeCoach();
  }

  function addDeathMark(reason = lastDeathReason) {
    const points = recentPath
      .filter((point) => point.room === roomIndex)
      .map((point) => ({ ...point }));
    if (points.length > 2) {
      deathReplays.push({
        room: roomIndex,
        points,
        life: DEATH_REPLAY_LIFE,
        max: DEATH_REPLAY_LIFE,
        reason: normalizeDeathReason(reason)
      });
      while (deathReplays.length > 4) deathReplays.shift();
    }
    deathMarks.push({
      room: roomIndex,
      x: player.x + player.w / 2,
      y: player.y + player.h / 2,
      life: DEATH_MARK_LIFE,
      max: DEATH_MARK_LIFE,
      reason: normalizeDeathReason(reason)
    });
    while (deathMarks.length > 12) deathMarks.shift();
    clearRecentPath();
  }

  function getInput() {
    const left = keys.has("ArrowLeft") || keys.has("KeyA") || touch.left || gamepadInput.left;
    const right = keys.has("ArrowRight") || keys.has("KeyD") || touch.right || gamepadInput.right;
    const up = keys.has("ArrowUp") || keys.has("KeyW") || touch.up || gamepadInput.up;
    const down = keys.has("ArrowDown") || keys.has("KeyS") || touch.down || gamepadInput.down;
    const grab = settings.grabMode === "toggle" ? grabLatched : rawGrabHeld();
    return {
      x: right ? 1 : left ? -1 : 0,
      y: down ? 1 : up ? -1 : 0,
      grab
    };
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

  function justPressed(code) {
    return pressed.has(code);
  }

  function justPressedAny(codes) {
    for (const code of codes) {
      if (pressed.has(code)) return true;
    }
    return false;
  }

  function keyHeldAny(codes) {
    for (const code of codes) {
      if (keys.has(code)) return true;
    }
    return false;
  }

  function queueAction(code) {
    if (isActionCode(code, "jump")) {
      player.jumpBuffer = JUMP_BUFFER_TIME;
      actionPulse.jump = ACTION_PULSE_TIME;
    }
    if (isActionCode(code, "dash")) {
      player.dashBuffer = DASH_BUFFER_TIME;
      actionPulse.dash = ACTION_PULSE_TIME;
    }
    if (isActionCode(code, "grab")) {
      actionPulse.grab = ACTION_PULSE_TIME;
    }
  }

  function updateGamepad() {
    const supported = typeof navigator !== "undefined" && typeof navigator.getGamepads === "function";
    const pads = supported ? navigator.getGamepads() : [];
    const connectedPads = Array.from(pads || []).filter(Boolean);
    const pad = connectedPads[0];
    const nextHeld = new Set();

    for (const key of Object.keys(gamepadInput)) {
      gamepadInput[key] = false;
    }

    if (pad) {
      const deadzone = settings.gamepadDeadzone;
      const ax = Math.abs(pad.axes[0] || 0) > deadzone ? pad.axes[0] : 0;
      const ay = Math.abs(pad.axes[1] || 0) > deadzone ? pad.axes[1] : 0;
      const pressedButton = (index, threshold = 0.5) => Boolean(pad.buttons[index]?.pressed || pad.buttons[index]?.value > threshold);
      gamepadInput.left = ax < -deadzone || pressedButton(14);
      gamepadInput.right = ax > deadzone || pressedButton(15);
      gamepadInput.up = ay < -deadzone || pressedButton(12);
      gamepadInput.down = ay > deadzone || pressedButton(13);
      gamepadInput.jump = pressedButton(0);
      gamepadInput.dash = pressedButton(1) || pressedButton(2) || pressedButton(7, 0.35);
      gamepadInput.grab = pressedButton(4) || pressedButton(5) || pressedButton(6, 0.35);
      gamepadInput.recall = pressedButton(3) || pressedButton(8);

      for (const action of ["jump", "dash", "grab", "recall"]) {
        if (gamepadInput[action]) nextHeld.add(action);
      }
    }

    const activeActions = Object.keys(gamepadInput).filter((key) => gamepadInput[key]);
    lastGamepadStatus = {
      supported,
      connected: Boolean(pad),
      count: connectedPads.length,
      standardMapping: connectedPads.filter((item) => item.mapping === "standard").length,
      activeActions
    };
    updateGamepadStatusOutput();

    for (const action of nextHeld) {
      if (!gamepadHeld.has(action)) {
        gamepadPressed.add(action);
        if (actionPulse[action] !== undefined) actionPulse[action] = ACTION_PULSE_TIME;
      }
    }
    gamepadHeld = nextHeld;
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
    return `${lastGamepadStatus.count} 个 · standard ${lastGamepadStatus.standardMapping}${active}`;
  }

  function recallToAnchor() {
    if (!echoAnchor || echoAnchor.room !== roomIndex || recallCooldown > 0 || player.deadTimer > 0) return;
    markRoomTech("recall");
    player.x = echoAnchor.x;
    player.y = echoAnchor.y;
    player.vx = 0;
    player.vy = 0;
    player.dashes = 1;
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
    playSound("recall");
    hitStopTimer = Math.max(hitStopTimer, 0.012);
    resetRelayChain();
    clearRecentPath();
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.green, 20, 260);
  }

  function actionCodes(action) {
    return CONTROL_PRESETS[settings.controlsPreset]?.[action] || CONTROL_PRESETS.comfort[action];
  }

  function isActionCode(code, action) {
    return actionCodes(action).includes(code);
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

  function showFeelCue(text, detail = "", color = palette.cyan, duration = FEEL_CUE_TIME) {
    feelCueText = text;
    feelCueDetail = detail;
    feelCueColor = color;
    feelCueMax = duration;
    feelCueTimer = duration;
  }

  function clearFeelCue() {
    feelCueTimer = 0;
    feelCueText = "";
    feelCueDetail = "";
    feelCueColor = palette.cyan;
    feelCueMax = FEEL_CUE_TIME;
  }

  function roomSelectLabel(index) {
    return `${index + 1}. ${ROOM_NAMES[index] || "Summit"} · ${roomMedalLabel(index)} · ${roomPaceShort(index)} · ${styleTrialLabel(index)} · ${roomCleanShort(index)} · ${roomSkillShort(index)}${roomSelectFocusLabel(index)}`;
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
    roomSelect.value = String(roomIndex);
    updateRoomBrief();
  }

  function roomBriefText(index) {
    return [
      `R${index + 1} ${ROOM_NAMES[index] || "Summit"} · ${roomMedalLabel(index)} · ${roomPaceLabel(index)}`,
      `${roomCleanText(index)} · ${roomDrillText(index)} · ${roomSkillLabel(index)}`,
      `合同 ${roomDrillContractText(index)}`,
      styleTrialText(index),
      `目标 ${roomPurposeLabel(index)}`,
      `SAFE ${routeLineCore(index, 0)}`,
      `FAST ${routeLineCore(index, 1)}`,
      `EXPERT ${routeLineCore(index, 2)}`
    ].join("\n");
  }

  function updateRoomBrief() {
    if (!roomBrief || !roomSelect) return;
    const index = Number(roomSelect.value);
    const target = Number.isInteger(index) && index >= 0 && index < maps.length ? index : roomIndex;
    roomBrief.textContent = roomBriefText(target);
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
        deaths: deathCount,
        runTime: Math.round(runTime * 100) / 100,
        roomTime: Math.round(roomTime * 100) / 100,
        flowPeak: Math.floor(flowPeak),
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

  function downloadDiagnosticsSnapshot(text, build) {
    downloadTextFile(text, `summit-spark-diagnostics-${build || "dev"}.json`, "application/json");
  }

  async function copyDiagnosticsSnapshot() {
    const snapshot = buildDiagnosticsSnapshot();
    const text = JSON.stringify(snapshot, null, 2);
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) downloadDiagnosticsSnapshot(text, snapshot.build);
    const verb = copied ? "已复制" : "已下载";
    setGameStatus(`诊断${verb}，可贴到反馈`);
    showGameTip(`诊断${verb}`, "仅包含版本、设置、进度摘要和设备视口，不含身份信息", "coach", GAME_TIP_TIME, 3);
    playSound("ui", 0.72);
  }

  async function copyFeedbackTemplate() {
    const snapshot = buildDiagnosticsSnapshot();
    const text = buildFeedbackTemplate(snapshot);
    window.__summitLastFeedbackTemplate = text;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) downloadTextFile(text, `summit-spark-feedback-${snapshot.build || "dev"}.txt`);
    const verb = copied ? "已复制" : "已下载";
    setGameStatus(`反馈模板${verb}`);
    showGameTip(`反馈模板${verb}`, "包含版本、视口、训练状态和可填写复现项", "coach", GAME_TIP_TIME, 3);
    playSound("ui", 0.68);
  }

  function buildSaveArchive() {
    const archive = {
      kind: SAVE_ARCHIVE_KIND,
      schemaVersion: SAVE_ARCHIVE_SCHEMA_VERSION,
      build: document.querySelector('meta[name="build-version"]')?.content || "dev",
      exportedAt: new Date().toISOString(),
      storage: {
        settings,
        profile,
        roomBests: bestRoomTimes,
        roomPaths: bestRoomPaths,
        roomFocus: {
          schemaVersion: ROOM_FOCUS_SCHEMA_VERSION,
          rooms: roomFocus
        },
        bestTime: readBestTime(),
        bestFlow: readBestFlow()
      }
    };
    window.__summitLastSaveArchive = archive;
    return archive;
  }

  function buildSaveArchiveText() {
    return JSON.stringify(buildSaveArchive(), null, 2);
  }

  function setSaveImportStatus(text, state = "") {
    if (!saveImportStatus) return;
    saveImportStatus.textContent = text;
    saveImportStatus.classList.toggle("valid", state === "valid");
    saveImportStatus.classList.toggle("error", state === "error");
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
    showGameTip("存档已导入", "刷新后使用导入的设置和训练档案", "storage", GAME_TIP_TIME, 3);
    playSound("ui", 0.74);
    window.setTimeout(() => window.location.reload(), 520);
  }

  function importSaveArchive(text) {
    const normalized = normalizeSaveArchiveText(text);
    writeNormalizedSaveArchive(normalized);
    return normalized;
  }

  function normalizeSaveArchiveText(text) {
    if (text.length > SAVE_ARCHIVE_MAX_CHARS) throw new Error("导入内容过大");
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("不是有效 JSON");
    }
    if (!parsed || typeof parsed !== "object" || parsed.kind !== SAVE_ARCHIVE_KIND || !parsed.storage || typeof parsed.storage !== "object") {
      throw new Error("不是 summit-spark-save 存档");
    }
    const source = parsed.storage;
    return {
      sourceBuild: typeof parsed.build === "string" && parsed.build ? parsed.build.slice(0, 40) : "",
      settings: normalizeSettings(source.settings, defaultSettings()),
      profile: normalizeProfile(source.profile),
      roomBests: normalizeRoomBests(source.roomBests),
      roomPaths: normalizeRoomPaths(source.roomPaths),
      roomFocus: normalizeRoomFocus(source.roomFocus),
      bestTime: finiteNonNegativeNumber(source.bestTime, 0, 36000),
      bestFlow: finiteNonNegativeNumber(source.bestFlow, 0, 999)
    };
  }

  function writeNormalizedSaveArchive(normalized) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized.settings));
      localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized.profile));
      localStorage.setItem(ROOM_BESTS_KEY, JSON.stringify(normalized.roomBests));
      localStorage.setItem(ROOM_PATHS_KEY, JSON.stringify(normalized.roomPaths));
      localStorage.setItem(ROOM_FOCUS_KEY, JSON.stringify({
        schemaVersion: ROOM_FOCUS_SCHEMA_VERSION,
        rooms: normalized.roomFocus
      }));
      localStorage.setItem(BEST_TIME_KEY, String(normalized.bestTime));
      localStorage.setItem(BEST_FLOW_KEY, String(Math.floor(normalized.bestFlow)));
    } catch {
      throw new Error("浏览器存档不可写");
    }
  }

  function focusGame() {
    try {
      canvas.focus({ preventScroll: true });
    } catch {
      canvas.focus();
    }
  }


  function setDebugVisible(value) {
    debugVisible = value;
    debugPanel.classList.toggle("hidden", !debugVisible);
    debugPanel.setAttribute("aria-hidden", String(!debugVisible));
    if (debugToggle) debugToggle.checked = debugVisible;
    updateDebug();
  }

  function toggleSettings() {
    settingsVisible = !settingsVisible;
    releaseAllInputs();
    syncSettingsVisibility();
    if (settingsVisible) {
      settingsPanel.scrollTop = 0;
      syncSettingsPanel();
      setGameStatus("设置已打开，游戏暂停");
      settingsCloseButton?.focus({ preventScroll: true });
    } else {
      clearFocusResetConfirm();
      setGameStatus("设置已关闭");
      focusGame();
    }
  }

  function closeSettings() {
    settingsVisible = false;
    releaseAllInputs();
    clearFocusResetConfirm();
    syncSettingsVisibility();
    setGameStatus("设置已关闭");
    focusGame();
  }

  function syncSettingsVisibility() {
    stage?.classList.toggle("settings-open", settingsVisible);
    settingsPanel?.classList.toggle("hidden", !settingsVisible);
    settingsPanel?.setAttribute("aria-hidden", String(!settingsVisible));
    settingsButton?.setAttribute("aria-expanded", String(settingsVisible));
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
    if (audioToggle) audioToggle.checked = settings.audioEnabled;
    if (audioVolumeSlider) audioVolumeSlider.value = String(settings.audioVolume);
    if (controlPresetSelect) controlPresetSelect.value = settings.controlsPreset;
    if (grabModeSelect) grabModeSelect.value = settings.grabMode;
    if (gamepadDeadzoneSlider) gamepadDeadzoneSlider.value = String(settings.gamepadDeadzone);
    if (touchSizeSlider) touchSizeSlider.value = String(settings.touchSize);
    syncComfortSettings();
    updateGamepadStatusOutput();
    updatePracticeCoach();
  }

  function syncComfortSettings() {
    stage?.classList.toggle("low-performance", settings.lowPerformance);
    stage?.style.setProperty("--touch-size", `${settings.touchSize}px`);
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
    focusResetButton.textContent = armed ? "Confirm" : "Reset";
    focusResetButton.classList.toggle("armed", armed);
    focusResetButton.title = armed ? "再点一次清空所有 Focus/Drill 统计" : "清空 Focus 统计，需要二次确认";
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
    setGameStatus("再点一次 Reset 清空 Focus 统计");
    return false;
  }

  function defaultSettings() {
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      shake: SHAKE_INTENSITY,
      calmEffects: true,
      lowPerformance: false,
      controlsPreset: "comfort",
      grabMode: "hold",
      gamepadDeadzone: GAMEPAD_DEADZONE_DEFAULT,
      touchSize: TOUCH_SIZE_DEFAULT,
      practiceLines: true,
      ghostOpacity: 0.75,
      audioEnabled: true,
      audioVolume: 0.35
    };
  }

  function readSettings() {
    const defaults = defaultSettings();
    return readStoredJson(SETTINGS_KEY, defaults, (saved) => normalizeSettings(saved, defaults));
  }

  function clampGamepadDeadzone(value) {
    return Math.max(GAMEPAD_DEADZONE_MIN, Math.min(GAMEPAD_DEADZONE_MAX, finiteNonNegativeNumber(value, GAMEPAD_DEADZONE_DEFAULT, GAMEPAD_DEADZONE_MAX)));
  }

  function clampTouchSize(value) {
    return Math.max(TOUCH_SIZE_MIN, Math.min(TOUCH_SIZE_MAX, finiteNonNegativeInt(value, TOUCH_SIZE_DEFAULT, TOUCH_SIZE_MAX)));
  }

  function normalizeSettings(saved, defaults) {
    const source = saved && typeof saved === "object" ? saved : {};
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      shake: finiteNonNegativeNumber(source.shake, defaults.shake, 1),
      calmEffects: strictBoolean(source.calmEffects, defaults.calmEffects),
      lowPerformance: strictBoolean(source.lowPerformance, defaults.lowPerformance),
      controlsPreset: CONTROL_PRESETS[source.controlsPreset] ? source.controlsPreset : defaults.controlsPreset,
      grabMode: source.grabMode === "toggle" ? "toggle" : defaults.grabMode,
      gamepadDeadzone: clampGamepadDeadzone(source.gamepadDeadzone ?? defaults.gamepadDeadzone),
      touchSize: clampTouchSize(source.touchSize ?? defaults.touchSize),
      practiceLines: strictBoolean(source.practiceLines, defaults.practiceLines),
      ghostOpacity: Math.max(0.2, Math.min(1, finiteNonNegativeNumber(source.ghostOpacity, defaults.ghostOpacity, 1))),
      audioEnabled: strictBoolean(source.audioEnabled, defaults.audioEnabled),
      audioVolume: finiteNonNegativeNumber(source.audioVolume, defaults.audioVolume, 1)
    };
  }

  function writeSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Settings are convenience only; gameplay should continue without storage.
    }
  }

  const SOUND_PRESETS = {
    ui: [{ type: "sine", from: 520, to: 740, gain: 0.035, time: 0.08 }],
    jump: [{ type: "triangle", from: 320, to: 520, gain: 0.052, time: 0.11 }],
    wall: [{ type: "square", from: 220, to: 360, gain: 0.045, time: 0.1 }],
    dash: [{ type: "sawtooth", from: 660, to: 280, gain: 0.048, time: 0.09 }],
    spark: [{ type: "triangle", from: 520, to: 920, gain: 0.058, time: 0.14 }],
    wallSpark: [{ type: "triangle", from: 420, to: 760, gain: 0.055, time: 0.13 }, { type: "sine", from: 260, to: 360, gain: 0.025, time: 0.12 }],
    prismSpark: [{ type: "sawtooth", from: 720, to: 1180, gain: 0.052, time: 0.16 }, { type: "triangle", from: 360, to: 520, gain: 0.026, time: 0.15 }],
    relay: [{ type: "sine", from: 640, to: 980, gain: 0.056, time: 0.13 }],
    chain: [{ type: "triangle", from: 760, to: 1240, gain: 0.07, time: 0.16 }],
    prism: [{ type: "sawtooth", from: 360, to: 860, gain: 0.062, time: 0.18 }],
    refill: [{ type: "sine", from: 480, to: 720, gain: 0.045, time: 0.12 }],
    spring: [{ type: "triangle", from: 260, to: 620, gain: 0.055, time: 0.13 }],
    echo: [{ type: "sine", from: 300, to: 420, gain: 0.04, time: 0.16 }],
    recall: [{ type: "triangle", from: 760, to: 320, gain: 0.055, time: 0.18 }],
    crumble: [{ type: "sawtooth", from: 180, to: 90, gain: 0.05, time: 0.16 }],
    land: [{ type: "triangle", from: 120, to: 90, gain: 0.03, time: 0.08 }],
    death: [{ type: "sawtooth", from: 240, to: 80, gain: 0.07, time: 0.2 }],
    clear: [{ type: "sine", from: 520, to: 880, gain: 0.05, time: 0.15 }, { type: "triangle", from: 780, to: 1120, gain: 0.035, time: 0.18 }]
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
    } catch {
      audioContext = null;
      audioMaster = null;
    }
  }

  function playSound(name, intensity = 1) {
    if (!settings.audioEnabled || settings.audioVolume <= 0) return;
    unlockAudio();
    if (!audioContext || !audioMaster) return;
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    const preset = SOUND_PRESETS[name] || SOUND_PRESETS.ui;
    const now = audioContext.currentTime;
    const cooldown = name === "land" ? 0.08 : name === "ui" ? 0.04 : 0.035;
    if (soundCooldowns[name] && now - soundCooldowns[name] < cooldown) return;
    soundCooldowns[name] = now;
    audioMaster.gain.setTargetAtTime(Math.max(0, Math.min(0.7, settings.audioVolume)), now, 0.01);
    preset.forEach((voice, index) => playTone(voice, now + index * 0.012, intensity));
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
    const count = settings.lowPerformance ? 2 : settings.calmEffects ? 3 : 5;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2 + 7;
    const angle = Math.atan2(dy, dx);
    const color = player.overdrive > 0 ? palette.gold : palette.cyan;
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1);
      lightTrails.push({
        x: cx - dx * LIGHT_TRAIL_STEP * i,
        y: cy - dy * LIGHT_TRAIL_STEP * i + Math.sin(t * Math.PI) * 2,
        w: LIGHT_TRAIL_WIDTH - i * 4,
        h: LIGHT_TRAIL_HEIGHT,
        angle,
        color,
        life: LIGHT_TRAIL_LIFE - i * 0.055,
        max: LIGHT_TRAIL_LIFE,
        pulse: 0.16
      });
    }
    while (lightTrails.length > 18) lightTrails.shift();
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
    for (const trail of lightTrails) {
      const age = Math.max(0, trail.life / trail.max);
      const pulse = trail.pulse > 0 ? 1 + trail.pulse * 2.6 : 1;
      const width = trail.w * pulse;
      const color = trail.color || palette.cyan;
      ctx.save();
      ctx.translate(trail.x, trail.y);
      ctx.rotate(trail.angle || 0);
      ctx.globalAlpha = Math.min(0.72, age * 0.7);
      ctx.shadowColor = color;
      ctx.shadowBlur = settings.calmEffects ? 6 : 12;
      ctx.fillStyle = color;
      roundRect(ctx, -width / 2, -trail.h / 2, width, trail.h, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.56)";
      ctx.fillRect(-width / 2 + 6, -1, Math.max(6, trail.w - 12) * age, 2);
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
    roomBestFlashTimer = Math.max(0, roomBestFlashTimer - dt);
    nearMissCooldown = Math.max(0, nearMissCooldown - dt);
    recallCooldown = Math.max(0, recallCooldown - dt);
    recallPulseTimer = Math.max(0, recallPulseTimer - dt);
    roomIntroTimer = Math.max(0, roomIntroTimer - dt);
    splitPopupTimer = Math.max(0, splitPopupTimer - dt);
    feelCueTimer = Math.max(0, feelCueTimer - dt);
    routeCueTimer = Math.max(0, routeCueTimer - dt);
    masteryPopupTimer = Math.max(0, masteryPopupTimer - dt);
    focusPopupTimer = Math.max(0, focusPopupTimer - dt);
    deathCoachTimer = Math.max(0, deathCoachTimer - dt);
    failureCueTimer = Math.max(0, failureCueTimer - dt);
    crumbleSlipTimer = Math.max(0, crumbleSlipTimer - dt);
    updateGameTip(dt);
    updateFlow(dt);
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
      const targetX = prev.x - player.facing * (5 + i * 0.6);
      const targetY = prev.y + 3.2;
      strand.x += (targetX - strand.x) * Math.min(1, dt * 18);
      strand.y += (targetY - strand.y) * Math.min(1, dt * 18);
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

    if (dt > 0.012 && Math.random() < (settings.lowPerformance ? 0.16 : 0.5)) {
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
  }

  function addGhost(alpha) {
    ghosts.push({
      x: player.x,
      y: player.y,
      facing: player.facing,
      life: 0.18,
      max: 0.18,
      alpha
    });
  }

  function updateGhosts(dt) {
    for (let i = ghosts.length - 1; i >= 0; i--) {
      ghosts[i].life -= dt;
      if (ghosts[i].life <= 0) ghosts.splice(i, 1);
    }
  }

  function updateDeathMarks(dt) {
    for (let i = deathMarks.length - 1; i >= 0; i--) {
      deathMarks[i].life -= dt;
      if (deathMarks[i].life <= 0) deathMarks.splice(i, 1);
    }
    for (let i = deathReplays.length - 1; i >= 0; i--) {
      deathReplays[i].life -= dt;
      if (deathReplays[i].life <= 0) deathReplays.splice(i, 1);
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
    const budgetedCount = settings.lowPerformance ? Math.max(2, Math.ceil(count * 0.48)) : count;
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
    drawDeathReplays();
    drawDeathMarks(time);
    drawFailureGhostLine(time);
    drawParticles();
    drawGhosts();
    drawSparkCue(time);
    drawDashAimPreview(time);
    drawInputCues(time);
    drawFeelCue(time);
    drawFlowCue(time);
    drawRelayChainCue(time);
    drawRoomBestCue();
    drawPlayerAura(time);
    if (player.deadTimer <= 0) drawPlayer(time);
    drawFailureRehearsalCue(time);
    ctx.restore();
    drawFlowAtmosphere(time);
    drawTimingGateCue(time);
    drawRoomIntro(time);
    drawRouteFocusCue(time);
    drawMasteryPopup(time);
    drawSplitPopup(time);
    drawFocusPopup(time);
    drawDeathCoach(time);
    drawDrillHud(time);
    drawActiveChallengeHud(time);
    drawPaceRibbon(time);
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
    ctx.shadowBlur = settings.calmEffects ? 8 : 16;
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
    if (player.deadTimer > 0 || player.dashes <= 0 || player.dashCooldown > 0) return;
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
    ctx.shadowBlur = settings.calmEffects ? 5 : 11;
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

  function drawRelayChainCue(time) {
    if (relayPopupTimer <= 0 || relayChain <= 1 || player.deadTimer > 0) return;
    const t = relayPopupTimer / 0.68;
    const cx = player.x + player.w / 2;
    const cy = player.y - 16 - (1 - t) * 12;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.35);
    ctx.font = "600 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = palette.cyan;
    ctx.shadowBlur = 10;
    ctx.fillStyle = relayChain >= 3 ? palette.gold : "#f8fbff";
    ctx.fillText(`x${relayChain}`, cx, cy);
    ctx.strokeStyle = relayChain >= 3 ? palette.gold : palette.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, player.y + player.h / 2, 22 + Math.sin(time * 22) * 1.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawRoomBestCue() {
    if (roomBestFlashTimer <= 0 || player.deadTimer > 0) return;
    const t = roomBestFlashTimer / ROOM_BEST_FLASH_TIME;
    const cx = player.x + player.w / 2;
    const cy = player.y - 31 - (1 - t) * 10;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.4);
    ctx.font = "600 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = palette.gold;
    ctx.shadowBlur = 10;
    ctx.fillStyle = palette.gold;
    ctx.fillText("PB", cx, cy);
    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, player.y + player.h / 2, 24 + (1 - t) * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawInputCues(time) {
    if (player.deadTimer > 0) return;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const jump = Math.max(actionPulse.jump, player.jumpBuffer) / Math.max(ACTION_PULSE_TIME, JUMP_BUFFER_TIME);
    const dash = Math.max(actionPulse.dash, player.dashBuffer) / Math.max(ACTION_PULSE_TIME, DASH_BUFFER_TIME);
    const grab = actionPulse.grab / ACTION_PULSE_TIME;
    const fall = actionPulse.fall / ACTION_PULSE_TIME;
    const wall = Math.max(actionPulse.wall, player.wallCoyote) / Math.max(ACTION_PULSE_TIME, WALL_COYOTE_TIME);
    const apex = actionPulse.apex / ACTION_PULSE_TIME;

    if (dash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.82, dash);
      ctx.strokeStyle = palette.cyan;
      ctx.lineWidth = 2;
      ctx.shadowColor = palette.cyan;
      ctx.shadowBlur = settings.calmEffects ? 6 : 12;
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4 + time * 2.6);
      ctx.strokeRect(-14 - dash * 5, -14 - dash * 5, 28 + dash * 10, 28 + dash * 10);
      ctx.restore();
    }

    if (jump > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.84, jump);
      ctx.strokeStyle = "#fff0a0";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.shadowColor = palette.gold;
      ctx.shadowBlur = settings.calmEffects ? 5 : 10;
      const lift = 8 + (1 - jump) * 8;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 19 - lift);
      ctx.lineTo(cx, cy - 28 - lift);
      ctx.lineTo(cx + 8, cy - 19 - lift);
      ctx.stroke();
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
      ctx.shadowBlur = settings.calmEffects ? 5 : 11;
      const x = cx + side * (player.w * 0.85 + 6);
      ctx.beginPath();
      ctx.moveTo(x, cy - 16);
      ctx.lineTo(x + side * 7, cy - 7);
      ctx.moveTo(x, cy + 16);
      ctx.lineTo(x + side * 7, cy + 7);
      ctx.stroke();
      ctx.restore();
    }

    if (apex > 0) {
      const width = 26 + apex * 16;
      ctx.save();
      ctx.globalAlpha = Math.min(0.58, apex);
      ctx.strokeStyle = "rgba(255,240,160,0.92)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.shadowColor = palette.gold;
      ctx.shadowBlur = settings.calmEffects ? 4 : 9;
      ctx.beginPath();
      ctx.moveTo(cx - width / 2, cy - 33);
      ctx.lineTo(cx + width / 2, cy - 33);
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
    if (player.deadTimer > 0 || feelCueTimer <= 0 || !feelCueText) return;
    const t = Math.max(0, Math.min(1, feelCueTimer / feelCueMax));
    const cx = player.x + player.w / 2;
    const y = Math.max(42, player.y - 44 - (1 - t) * 10);
    ctx.save();
    ctx.font = "600 11px system-ui, sans-serif";
    const title = fitText(feelCueText, 120);
    const detail = feelCueDetail ? fitText(feelCueDetail, 180) : "";
    const width = Math.min(210, Math.max(78, Math.max(ctx.measureText(title).width, detail ? ctx.measureText(detail).width : 0) + 24));
    const height = detail ? 38 : 24;
    const x = Math.max(10, Math.min(W - width - 10, cx - width / 2));
    const alpha = Math.min(1, t * 1.55);
    ctx.globalAlpha = alpha * 0.82;
    ctx.fillStyle = "rgba(7,12,20,0.72)";
    roundRect(ctx, x, y, width, height, 7);
    ctx.fill();
    ctx.strokeStyle = feelCueColor;
    ctx.lineWidth = 1.3;
    ctx.shadowColor = feelCueColor;
    ctx.shadowBlur = settings.calmEffects ? 4 : 10;
    roundRect(ctx, x + 0.65, y + 0.65, width - 1.3, height - 1.3, 7);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = feelCueColor;
    ctx.fillText(title, x + width / 2, y + (detail ? 12 : height / 2));
    if (detail) {
      ctx.font = "600 9px system-ui, sans-serif";
      ctx.shadowBlur = settings.calmEffects ? 2 : 5;
      ctx.fillStyle = "rgba(248,251,255,0.72)";
      ctx.fillText(detail, x + width / 2, y + 27);
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
    const length = Math.min(96, Math.max(48, dist * 0.26));
    const sx = cx + dx * 24;
    const sy = cy + dy * 20;
    const ex = sx + dx * length;
    const ey = sy + dy * length;
    const pulse = 0.5 + Math.sin(time * 5.6) * 0.5;

    ctx.save();
    ctx.globalAlpha = (settings.calmEffects ? 0.28 : 0.38) * Math.min(1, fade * 1.4);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.setLineDash([8, 8]);
    ctx.shadowColor = data.color;
    ctx.shadowBlur = settings.calmEffects ? 5 : 12;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = (0.5 + pulse * 0.24) * Math.min(1, fade * 1.6);
    ctx.translate(ex, ey);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = data.color;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-7, -7);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-Math.atan2(dy, dx));
    ctx.font = "600 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = fitText(target.label || routeSlotShort(data.slot), 64);
    const labelWidth = Math.min(76, Math.max(34, ctx.measureText(label).width + 12));
    ctx.globalAlpha = 0.7 * Math.min(1, fade * 1.5);
    ctx.fillStyle = "rgba(7,12,20,0.68)";
    roundRect(ctx, -labelWidth / 2, -30, labelWidth, 18, 5);
    ctx.fill();
    ctx.fillStyle = data.color;
    ctx.fillText(label, 0, -21);
    ctx.restore();
  }

  function drawRouteFocusCue(time) {
    if (!started || won || player.deadTimer > 0 || !routeCueActive()) return;
    if (gameTipVisible("onboarding") || gameTipVisible("death")) return;
    if (failureCueActive()) return;
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
    const pulse = 0.5 + Math.sin(time * 4.2) * 0.5;

    ctx.save();
    ctx.globalAlpha = alpha * 0.84;
    ctx.fillStyle = "rgba(7,12,20,0.72)";
    roundRect(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.strokeStyle = data.color;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = data.color;
    ctx.shadowBlur = settings.calmEffects ? 4 : 10;
    roundRect(ctx, x + 0.7, y + 0.7, width - 1.4, height - 1.4, 8);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.fillStyle = data.color;
    ctx.fillText(`${data.reason} · ${data.title}`, x + 14, y + 17);
    ctx.font = `600 ${compact ? 13 : 12}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(248,251,255,0.86)";
    ctx.shadowBlur = settings.calmEffects ? 2 : 6;
    ctx.fillText(fitText(data.core, width - 28), x + 14, y + 38);
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.fillStyle = `rgba(255,240,160,${0.68 + pulse * 0.12})`;
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
      ctx.fillStyle = active ? `${color}33` : "rgba(255,255,255,0.08)";
      ctx.strokeStyle = active ? color : "rgba(255,255,255,0.16)";
      ctx.lineWidth = active ? 1.3 : 1;
      roundRect(ctx, sx, y, segment, height, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = active ? color : "rgba(248,251,255,0.52)";
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
    const pulse = 0.5 + Math.sin(time * 8) * 0.5;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.6) * 0.9;
    ctx.fillStyle = "rgba(7,12,20,0.72)";
    roundRect(ctx, x, y - rise, width, height, 8);
    ctx.fill();
    ctx.strokeStyle = masteryPopupColor;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = masteryPopupColor;
    ctx.shadowBlur = settings.calmEffects ? 4 : 11;
    roundRect(ctx, x + 0.7, y + 0.7 - rise, width - 1.4, height - 1.4, 8);
    ctx.stroke();
    ctx.globalAlpha = Math.min(1, t * 1.7);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = masteryPopupColor;
    ctx.font = `600 ${compact ? 14 : 13}px system-ui, sans-serif`;
    ctx.fillText(fitText(masteryPopupText, width - 28), x + 14, y + (masteryPopupDetail ? 18 : height / 2) - rise);
    if (masteryPopupDetail) {
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.shadowBlur = settings.calmEffects ? 2 : 5;
      ctx.fillStyle = `rgba(248,251,255,${0.72 + pulse * 0.08})`;
      ctx.fillText(fitText(masteryPopupDetail, width - 28), x + 14, y + 39 - rise);
    }
    ctx.restore();
  }

  function drawCurrentRoomPath(time) {
    if (!settings.practiceLines || roomPath.length < 2 || player.deadTimer > 0) return;
    const points = roomPath.filter((point) => point.room === roomIndex).slice(-CURRENT_PATH_DRAW_POINTS);
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
  }

  function drawBestRoomGhost(time) {
    if (!settings.practiceLines || player.deadTimer > 0) return;
    const path = bestRoomPaths[roomIndex];
    if (!Array.isArray(path) || path.length < 2) return;
    const rawIndex = pathIndexAtTime(path, roomTime, bestRoomTimes[roomIndex] || 0);
    const ghost = pointOnPath(path, rawIndex);
    if (!ghost) return;
    const pulse = 1 + Math.sin(time * 9) * 0.06;
    ctx.save();
    ctx.globalAlpha = 0.46 * settings.ghostOpacity;
    ctx.translate(ghost.x, ghost.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = palette.gold;
    ctx.shadowBlur = settings.calmEffects ? 6 : 12;
    ctx.fillStyle = "rgba(247,198,93,0.64)";
    roundRect(ctx, -7, -11, 14, 18, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(248,251,255,0.72)";
    ctx.fillRect(-4, -7, 8, 2);
    ctx.fillStyle = ghost.over ? palette.green : ghost.spark ? "#fff0a0" : ghost.dash ? palette.cyan : palette.gold;
    ctx.fillRect(-3, -16, 6, 5);
    ctx.restore();
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

  function drawRoomIntro(time) {
    if (roomIntroTimer <= 0) return;
    if (!started || (overlay && !overlay.classList.contains("hidden"))) return;
    if (gameTipVisible("onboarding") || gameTipVisible("death")) return;
    if (failureCueActive()) return;
    const t = roomIntroTimer / ROOM_INTRO_TIME;
    const introAlpha = Math.min(1, t * 1.4);
    const introTarget = ROOM_TARGETS[roomIndex] || 0;
    const introCompact = isCompactCanvas();
    const width = introCompact ? 280 : 240;
    const height = introCompact ? 48 : 42;
    const x = W / 2 - width / 2;
    const y = introCompact ? 82 : 74;
    ctx.save();
    ctx.globalAlpha = introAlpha * 0.78;
    ctx.fillStyle = "rgba(12, 12, 13, 0.58)";
    roundRect(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 8);
    ctx.stroke();
    ctx.globalAlpha = introAlpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.32)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "rgba(249,247,240,0.9)";
    ctx.font = `600 ${introCompact ? 15 : 14}px system-ui, sans-serif`;
    ctx.fillText(`R${roomIndex + 1} ${ROOM_NAMES[roomIndex] || "Summit"}`, W / 2, y + 17);
    ctx.fillStyle = "rgba(249,247,240,0.58)";
    ctx.font = `500 ${introCompact ? 12 : 11}px system-ui, sans-serif`;
    ctx.fillText(`target ${formatTime(introTarget)}`, W / 2, y + 33);
    ctx.restore();
    return;
    const best = bestRoomTimes[roomIndex] || 0;
    const target = ROOM_TARGETS[roomIndex] || 0;
    const route = routeFocusData(roomIndex);
    const masteryScore = roomMasteryScore(roomIndex);
    const compact = isCompactCanvas();
    const baseY = compact ? 118 : 82;
    const lift = (1 - t) * 10;
    const drill = activeDrillText(roomIndex);
    const focus = roomSelectFocusLabel(roomIndex).replace(" / ", "");
    const hasSecondDetail = !drill && !focus;
    const titleFont = compact ? 24 : 20;
    const bodyFont = compact ? 15 : 13;
    const fineFont = compact ? 13 : 12;
    const titleGap = compact ? 32 : 24;
    const lineGap = compact ? 24 : 21;
    const panelWidth = compact ? 700 : 680;
    const panelHeight = compact ? hasSecondDetail ? 170 : 152 : hasSecondDetail ? 146 : 130;
    const panelY = baseY - 24 - lift;
    const alpha = Math.min(1, t * 1.4);
    ctx.save();
    ctx.globalAlpha = alpha * (compact ? 0.82 : 0.72);
    ctx.fillStyle = compact ? "rgba(7,12,20,0.76)" : "rgba(7,12,20,0.66)";
    roundRect(ctx, W / 2 - panelWidth / 2, panelY, panelWidth, panelHeight, 8);
    ctx.fill();
    ctx.strokeStyle = compact ? "rgba(248,251,255,0.2)" : "rgba(248,251,255,0.16)";
    ctx.lineWidth = 1;
    roundRect(ctx, W / 2 - panelWidth / 2 + 0.5, panelY + 0.5, panelWidth - 1, panelHeight - 1, 8);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.62)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(248,251,255,0.92)";
    ctx.font = `600 ${titleFont}px system-ui, sans-serif`;
    ctx.fillText(`${roomIndex + 1}. ${ROOM_NAMES[roomIndex] || "Summit"}`, W / 2, baseY - lift);
    ctx.font = `600 ${bodyFont}px system-ui, sans-serif`;
    ctx.fillStyle = compact ? "rgba(248,251,255,0.78)" : "rgba(248,251,255,0.68)";
    ctx.fillText(`target ${formatTime(target)}${best ? ` / best ${formatTime(best)}` : ""}`, W / 2, baseY + titleGap - lift);
    ctx.fillStyle = compact ? "rgba(248,251,255,0.72)" : "rgba(248,251,255,0.62)";
    ctx.fillText(`${roomMedalLabel(roomIndex)} / ${roomPaceLabel(roomIndex)} / ${roomCleanText(roomIndex)} / ${roomDrillText(roomIndex)}`, W / 2, baseY + titleGap + lineGap - lift);
    ctx.fillText(fitText(roomPurposeLabel(roomIndex), compact ? 620 : 560), W / 2, baseY + titleGap + lineGap * 2 - lift);
    drawRouteSegmentStrip(W / 2 + panelWidth / 2 - 158, panelY + 13, 132, 10, route.slot);
    ctx.font = `600 ${fineFont}px system-ui, sans-serif`;
    if (drill) {
      ctx.fillStyle = compact ? "rgba(171,255,183,0.9)" : "rgba(143,227,155,0.82)";
      ctx.fillText(fitText(drill, compact ? 650 : 620), W / 2, baseY + titleGap + lineGap * 3.15 - lift);
      ctx.fillStyle = compact ? "rgba(255,240,160,0.88)" : "rgba(247,198,93,0.74)";
      ctx.fillText(fitText(`${routeSlotShort(route.slot)} ${route.core}`, compact ? 660 : 620), W / 2, baseY + titleGap + lineGap * 4.05 - lift);
    } else if (focus) {
      ctx.fillStyle = compact ? "rgba(255,220,130,0.9)" : "rgba(247,198,93,0.78)";
      ctx.fillText(`focus ${focus}`, W / 2, baseY + titleGap + lineGap * 3.15 - lift);
      ctx.fillStyle = compact ? "rgba(171,255,183,0.84)" : "rgba(143,227,155,0.7)";
      ctx.fillText(fitText(`${routeSlotShort(route.slot)} ${route.core}`, compact ? 660 : 620), W / 2, baseY + titleGap + lineGap * 4.05 - lift);
    } else {
      ctx.fillStyle = compact ? "rgba(171,255,183,0.88)" : "rgba(143,227,155,0.78)";
      ctx.fillText(fitText(styleTrialObjective(roomIndex), compact ? 660 : 660), W / 2, baseY + titleGap + lineGap * 3.15 - lift);
      ctx.fillStyle = compact ? "rgba(248,251,255,0.66)" : "rgba(248,251,255,0.58)";
      ctx.fillText(fitText(`${routeSlotShort(route.slot)} ${route.core} / ${roomMasteryLevel(masteryScore)} ${masteryScore} / ${roomTierLabel(roomIndex)}`, compact ? 660 : 620), W / 2, baseY + titleGap + lineGap * 4.05 - lift);
    }
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

  function summitReview() {
    const next = recommendedPracticeRoom();
    return `${chapterSummary()} / ${challengeSummary()} / ${weakestRoomSummary()} / ${splitLossSummary()} / 下个 Drill ${roomTrainingAdvice(next)}`;
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

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    const next = recommendedPracticeRoom();
    const nextMode = resolveDrillMode(next);
    const styleIndex = stylePracticeRoom();
    const loss = largestSplitLossRoom();
    const focus = strongestFocusRoom();
    const chapter = chapterCompletionData();
    const chapterText = `${chapterGrade(chapter.percent)} · ${chapter.percent}%`;
    const challengeItems = challengeBoardItems();
    const challengeWins = challengeItems.filter((item) => item.done).length;
    const nextChallenge = challengeItems.find((item) => !item.done) || challengeItems[challengeItems.length - 1];
    const challengeReview = activeChallengeReview();
    const challengeReviewCard = challengeReview ? reviewCardHtml("本轮挑战", challengeReview.value, challengeReview.detail, "primary") : "";
    const routeContractCard = reviewCardHtml("航线合同", routeContractSummaryText(), lastRouteContractResult?.detail || "三步连练会自动推进下一 Drill。", "primary");
    const splitValue = loss && loss.loss > 0 ? `R${loss.index + 1} ${formatDelta(loss.loss)}` : "全部达标";
    const splitDetail = loss && loss.loss > 0 ? routePracticeLine(loss.index) : "可以开始追高手线和 clean clear。";
    const focusValue = focus ? `R${focus.index + 1} ${deathReasonLabel(focus.reason)} ${focus.score}` : "暂无高压点";
    const focusDetail = focus ? roomCoachHint(focus.index, focus.reason) : "死亡结构稳定后，优先追最慢 split。";
    const lossButton = loss && loss.loss > 0
      ? `<button class="review-button" type="button" data-finish-drill="${loss.index}" data-finish-mode="pace">最慢房 Pace</button>`
      : "";
    const styleButton = `<button class="review-button" type="button" data-finish-drill="${styleIndex}" data-finish-mode="style">类型 Style</button>`;
    return `<div class="review-grid">`
      + reviewCardHtml("下一 Drill", `R${next + 1} ${drillModeLabel(nextMode)}`, drillObjectiveForRoom(next, nextMode), "primary")
      + reviewCardHtml("章节完成度", chapterText, `Clean ${chapter.clean}/${maps.length} · S ${chapter.pace}/${maps.length} · X ${chapter.expert}/${maps.length}`, "primary")
      + challengeReviewCard
      + routeContractCard
      + reviewCardHtml("长期挑战", `${challengeWins}/${LONG_TERM_CHALLENGES.length}`, nextChallenge ? `${nextChallenge.label}：${nextChallenge.detail}` : "挑战已全部完成")
      + reviewCardHtml("类型挑战", `R${styleIndex + 1} ${styleTrialLabel(styleIndex)}`, styleTrialReviewText(styleIndex))
      + reviewCardHtml("最大损失", splitValue, splitDetail)
      + reviewCardHtml("薄弱原因", focusValue, focusDetail)
      + reviewCardHtml("训练航线", practiceRouteSummary(), "先稳 clean，再追 target，最后冲高手线。")
      + `</div>${reviewRoadmapHtml()}<p class="review-advice">${escapeHtml(roomTrainingAdvice(next))}</p>`
      + `<div class="review-actions"><button class="review-button primary-review" type="button" data-finish-drill="${next}" data-finish-mode="${nextMode}">下一 ${drillModeLabel(nextMode)}</button>${styleButton}${lossButton}</div>`;
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
    ctx.shadowBlur = settings.calmEffects ? 6 : 13;
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
    ctx.shadowBlur = settings.calmEffects ? 5 : 11;
    ctx.fillStyle = "#ff99aa";
    ctx.fillText(fitText(focusPopupText, isCompactCanvas() ? 680 : 560), W / 2, y + Math.sin(time * 16) * 1.2);
    if (focusPopupDetail) {
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.fillStyle = "rgba(248,251,255,0.72)";
      ctx.shadowBlur = settings.calmEffects ? 3 : 7;
      ctx.fillText(fitText(focusPopupDetail, isCompactCanvas() ? 690 : 600), W / 2, y + 18);
    }
    ctx.restore();
  }

  function drawDeathCoach(time) {
    if (deathCoachTimer <= 0 || !deathCoachDetail) return;
    if (gameTipVisible("death") && player.deadTimer <= 0) return;
    if (failureCueActive() && player.deadTimer <= 0) return;
    const t = deathCoachTimer / DEATH_COACH_TIME;
    const compact = isCompactCanvas();
    const color = deathReasonColor(deathCoachReason);
    const width = compact ? 680 : 520;
    const height = compact ? 92 : 84;
    const x = compact ? W / 2 - width / 2 : 20;
    const y = roomIntroTimer > 0 ? (compact ? 252 : 238) : (compact ? 78 : 70);
    const alpha = Math.min(1, t * 1.65);

    ctx.save();
    ctx.globalAlpha = alpha * 0.88;
    ctx.fillStyle = "rgba(7,12,20,0.74)";
    roundRect(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = settings.calmEffects ? 4 : 10;
    roundRect(ctx, x + 0.75, y + 0.75, width - 1.5, height - 1.5, 8);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${compact ? 13 : 12}px system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(`${deathReasonLabel(deathCoachReason)} · ${deathCoachText}`, x + 14, y + 17);
    ctx.font = `600 ${compact ? 12 : 11}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(248,251,255,0.78)";
    ctx.shadowBlur = settings.calmEffects ? 2 : 6;
    ctx.fillText(fitText(deathCoachDetail, width - 28), x + 14, y + 38);
    if (deathCoachAction) {
      ctx.fillStyle = "rgba(255,240,160,0.86)";
      ctx.fillText(fitText(deathCoachAction, width - 28), x + 14, y + 58);
    }
    if (deathCoachPlan) {
      ctx.fillStyle = "rgba(143,227,155,0.82)";
      ctx.fillText(fitText(deathCoachPlan, width - 28), x + 14, y + 76);
    }
    ctx.restore();
  }

  function drawDrillHud(time) {
    if (!activeDrill || activeDrill.room !== roomIndex || won) return;
    const current = roomMistakes[roomIndex] || 0;
    const text = `${drillModeLabel(activeDrill.mode).toUpperCase()} R${roomIndex + 1} · ${activeDrill.objective}${current ? ` · !${current}` : " · 无失误"}`;
    const detail = [drillHudDetailText(activeDrill, roomIndex), routeContractHudDetail(roomIndex, activeDrill.mode)].filter(Boolean).join(" / ");
    const y = roomIntroTimer > 0 ? 188 : 84;
    const pulse = 0.5 + Math.sin(time * 8) * 0.5;
    ctx.save();
    ctx.font = "600 15px system-ui, sans-serif";
    const label = fitText(text, 520);
    const detailLabel = detail ? fitText(detail, 500) : "";
    const width = Math.min(590, Math.max(260, Math.max(ctx.measureText(label).width, detailLabel ? ctx.measureText(detailLabel).width : 0) + 32));
    const height = detailLabel ? 70 : 54;
    const x = W / 2 - width / 2;
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = "rgba(7,12,20,0.72)";
    roundRect(ctx, x, y - height / 2, width, height, 6);
    ctx.fill();
    ctx.strokeStyle = `rgba(143,227,155,${0.32 + pulse * 0.18})`;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x + 0.5, y - height / 2 + 0.5, width - 1, height - 1, 6);
    ctx.stroke();
    const limit = activeRoomTimeLimit(roomIndex);
    if (limit > 0) {
      const progress = Math.max(0, Math.min(1, roomTime / limit));
      const over = roomTime > limit;
      ctx.fillStyle = over ? "rgba(255,92,108,0.74)" : "rgba(143,227,155,0.78)";
      roundRect(ctx, x + 10, y + height / 2 - 8, (width - 20) * progress, 3, 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = palette.green;
    ctx.shadowBlur = settings.calmEffects ? 4 : 9;
    ctx.fillStyle = current ? "#fff0a0" : palette.green;
    ctx.fillText(label, W / 2, detailLabel ? y - 18 : y - 12);
    if (detailLabel) {
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.shadowBlur = settings.calmEffects ? 2 : 5;
      ctx.fillStyle = "rgba(248,251,255,0.74)";
      ctx.fillText(detailLabel, W / 2, y + 3);
    }
    drawContractStrip(x + 12, y + height / 2 - 24, width - 24, 12, roomIndex, activeDrill.mode);
    ctx.restore();
  }

  function drawActiveChallengeHud(time) {
    if (!activeChallenge || activeDrill || won || player.deadTimer > 0) return;
    if (roomIntroTimer > 0.25 || gameTipVisible("onboarding") || gameTipVisible("death")) return;
    const state = activeChallengeState();
    if (!state) return;
    const compact = isCompactCanvas();
    const color = state.failed ? palette.hot : state.done ? palette.green : state.kind === "flow" ? palette.gold : palette.cyan;
    const width = compact ? 360 : 340;
    const height = 52;
    const x = compact ? W - width - 16 : 18;
    let y = timingArmed ? H - 82 : H - 132;
    if (compact && routeCueActive()) y = H - 210;
    const pulse = 0.5 + Math.sin(time * 5.2) * 0.5;
    const title = fitText(`挑战 · ${state.label} · ${state.status}`, width - 28);
    const detail = fitText(state.detail, width - 28);
    const progress = Math.max(0, Math.min(1, state.progress / 100));

    ctx.save();
    ctx.globalAlpha = 0.84;
    ctx.fillStyle = "rgba(7,12,20,0.72)";
    roundRect(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.shadowColor = color;
    ctx.shadowBlur = settings.calmEffects ? 4 : 10;
    roundRect(ctx, x + 0.65, y + 0.65, width - 1.3, height - 1.3, 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.fillStyle = color;
    ctx.fillText(title, x + 14, y + 15);
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.shadowBlur = settings.calmEffects ? 2 : 5;
    ctx.fillStyle = "rgba(248,251,255,0.74)";
    ctx.fillText(detail, x + 14, y + 33);
    ctx.globalAlpha = 0.55 + pulse * 0.08;
    ctx.fillStyle = "rgba(248,251,255,0.12)";
    roundRect(ctx, x + 14, y + height - 8, width - 28, 3, 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    roundRect(ctx, x + 14, y + height - 8, (width - 28) * progress, 3, 2);
    ctx.fill();
    ctx.restore();
  }

  function drawContractStrip(x, y, width, height, index, activeMode) {
    const modes = ["clean", "pace", "style", "expert"];
    const gap = 5;
    const segment = (width - gap * (modes.length - 1)) / modes.length;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 9px system-ui, sans-serif";
    modes.forEach((mode, slot) => {
      const stats = drillContractStats(index, mode);
      const complete = stats.wins > 0;
      const active = mode === activeMode;
      const sx = x + slot * (segment + gap);
      ctx.fillStyle = complete
        ? "rgba(143,227,155,0.28)"
        : active
          ? "rgba(247,198,93,0.22)"
          : "rgba(255,255,255,0.06)";
      ctx.strokeStyle = active
        ? "rgba(247,198,93,0.76)"
        : complete
          ? "rgba(143,227,155,0.52)"
          : "rgba(255,255,255,0.12)";
      ctx.lineWidth = active ? 1.4 : 1;
      roundRect(ctx, sx, y, segment, height, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = active ? "#fff0a0" : complete ? "rgba(190,255,203,0.92)" : "rgba(248,251,255,0.54)";
      ctx.fillText(mode === "expert" ? "X" : drillModeLabel(mode).slice(0, 1), sx + segment / 2, y + height / 2 + 0.5);
    });
    ctx.restore();
  }

  function drawFlowCue(time) {
    if (player.deadTimer > 0 || flowPopupTimer <= 0 || flowScore <= 0) return;
    const t = flowPopupTimer / FLOW_POPUP_TIME;
    const cx = player.x + player.w / 2;
    const cy = player.y - 48 - (1 - t) * 12;
    const color = flowTierColor(flowScore);
    const text = flowScore >= 80 ? `${flowTierLabel(flowScore)} ${Math.floor(flowScore)}` : `${flowLabel.toUpperCase()} ${Math.floor(flowScore)}`;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.25);
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 9;
    ctx.fillStyle = color;
    ctx.fillText(text, cx, cy);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, player.y + player.h / 2, 28 + Math.sin(time * 20) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
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
    ctx.shadowBlur = settings.calmEffects ? 4 : 14;
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
    if (!started || won || !timingArmed || player.deadTimer > 0) return;
    const limit = activeRoomTimeLimit(roomIndex);
    if (!(limit > 0)) return;
    const progress = Math.max(0, Math.min(1, roomTime / limit));
    const over = roomTime > limit;
    const delta = roomTime - limit;
    const active = Boolean(activeDrill && activeDrill.room === roomIndex);
    const width = active ? 410 : 340;
    const height = 5;
    const x = W / 2 - width / 2;
    const y = H - 10;
    const color = over ? palette.hot : delta <= -1.5 ? palette.green : palette.gold;
    const alpha = active || over || roomIntroTimer > 0 ? 0.86 : 0.52;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(7,12,20,0.58)";
    roundRect(ctx, x, y, width, height, 3);
    ctx.fill();
    ctx.shadowColor = color;
    ctx.shadowBlur = settings.calmEffects ? 3 : 9;
    ctx.fillStyle = color;
    roundRect(ctx, x, y, width * progress, height, 3);
    ctx.fill();
    if (over) {
      const warning = 0.5 + Math.sin(time * 9) * 0.5;
      ctx.globalAlpha = 0.34 + warning * 0.18;
      ctx.fillStyle = palette.hot;
      roundRect(ctx, x, y - 2, width, height + 4, 4);
      ctx.fill();
    }
    if (active || over) {
      ctx.globalAlpha = alpha;
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.shadowBlur = settings.calmEffects ? 3 : 8;
      ctx.fillStyle = color;
      const label = active ? `${drillModeLabel(activeDrill.mode)} ${formatDelta(delta)}` : `PACE ${formatDelta(delta)}`;
      ctx.fillText(label, W / 2, y - 4);
    }
    ctx.restore();
  }

  function drawTimingGateCue(time) {
    if (!started || won || timingArmed || player.deadTimer > 0 || roomIntroTimer > 0.22) return;
    const compact = isCompactCanvas();
    const text = timingInputReady ? "首次输入开始计时" : "松开按键后待命";
    const detail = timingInputReady ? "移动 / 跳跃 / 冲刺" : "防止重开残留输入污染 split";
    const width = compact ? 330 : 300;
    const x = W / 2 - width / 2;
    const y = compact ? H - 74 : H - 64;
    const pulse = 0.5 + Math.sin(time * 4.8) * 0.5;

    ctx.save();
    ctx.globalAlpha = 0.74 + pulse * 0.12;
    ctx.fillStyle = "rgba(7,12,20,0.68)";
    roundRect(ctx, x, y, width, 42, 8);
    ctx.fill();
    ctx.strokeStyle = `rgba(118,215,255,${0.24 + pulse * 0.22})`;
    ctx.lineWidth = 1.2;
    roundRect(ctx, x + 0.6, y + 0.6, width - 1.2, 40.8, 8);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = palette.cyan;
    ctx.shadowBlur = settings.calmEffects ? 4 : 10;
    ctx.fillStyle = timingInputReady ? palette.cyan : "rgba(255,240,160,0.92)";
    ctx.font = `600 ${compact ? 13 : 12}px system-ui, sans-serif`;
    ctx.fillText(text, W / 2, y + 15);
    ctx.shadowBlur = settings.calmEffects ? 2 : 5;
    ctx.fillStyle = "rgba(248,251,255,0.7)";
    ctx.font = `600 ${compact ? 11 : 10}px system-ui, sans-serif`;
    ctx.fillText(detail, W / 2, y + 31);
    ctx.restore();
  }

  function roomAtmosphere() {
    return ROOM_ATMOSPHERES[roomIndex % ROOM_ATMOSPHERES.length] || ROOM_ATMOSPHERES[0];
  }

  function drawVelocityWake(time) {
    if (player.deadTimer > 0) return;
    const speed = Math.hypot(player.vx, player.vy);
    const dashPulse = Math.max(visualRatio("dash", 0.24), player.dashTimer / DASH_TIME);
    const sparkPulse = visualRatio("spark", 0.28);
    const over = player.overdrive > 0 ? 0.5 : 0;
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
    ctx.shadowBlur = settings.calmEffects ? 5 : 12;
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
    const atmosphere = roomAtmosphere();
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, atmosphere.top);
    gradient.addColorStop(0.55, atmosphere.mid);
    gradient.addColorStop(1, atmosphere.low);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.28;
    const starCount = settings.lowPerformance ? 22 : 42;
    for (let i = 0; i < starCount; i++) {
      const x = (i * 137 + roomIndex * 53) % W;
      const y = (i * 79 + 40) % 210;
      ctx.fillStyle = i % 6 === 0 ? atmosphere.rim : i % 5 === 0 ? atmosphere.haze : "#ecf9ff";
      ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
    ctx.restore();

    if (!settings.lowPerformance) drawSkyRibbons(time, atmosphere);
    drawChapterResonance(time, atmosphere);

    drawMountainLayer(atmosphere.back, 0.35, 80 + roomIndex * 18, 0.18);
    drawMountainLayer(atmosphere.midPeak, 0.48, 150 + roomIndex * 9, 0.12);
    drawMountainLayer(atmosphere.front, 0.72, 220, 0.08);

    ctx.fillStyle = `${atmosphere.moon}88`;
    ctx.beginPath();
    ctx.arc(W - 110 + Math.sin(roomIndex) * 16, 84 + Math.sin(time * 0.3) * 4, 42, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSkyRibbons(time, atmosphere) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < 3; i += 1) {
      const y = 68 + i * 34 + Math.sin(time * 0.22 + roomIndex + i) * 8;
      const drift = ((time * (8 + i * 3) + roomIndex * 43) % (W + 260)) - 130;
      ctx.globalAlpha = settings.calmEffects ? 0.06 : 0.09 + i * 0.02;
      ctx.strokeStyle = i === 1 ? atmosphere.rim : atmosphere.haze;
      ctx.lineWidth = 10 - i * 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = settings.calmEffects ? 2 : 9;
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
    ctx.shadowBlur = settings.calmEffects ? 5 : 12;
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
    ctx.globalAlpha = 0.78;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = -60; x <= W + 80; x += 90) {
      const peak = H * yBase - ((x + offset) % 170) * sway - 30;
      ctx.lineTo(x + 45, peak);
      ctx.lineTo(x + 110, H * yBase + 80);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
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

  function drawRock(x, y, gx, gy) {
    ctx.fillStyle = palette.rockDark;
    ctx.fillRect(x, y, TILE, TILE);
    const grad = ctx.createLinearGradient(x, y, x + TILE, y + TILE);
    grad.addColorStop(0, palette.rockLight);
    grad.addColorStop(0.18, palette.rock);
    grad.addColorStop(1, palette.rockDark);
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath();
    if ((gx + gy) % 2 === 0) {
      ctx.moveTo(x + 5, y + 8);
      ctx.lineTo(x + 22, y + 4);
      ctx.lineTo(x + 28, y + 21);
    } else {
      ctx.moveTo(x + 3, y + 20);
      ctx.lineTo(x + 17, y + 9);
      ctx.lineTo(x + 29, y + 14);
    }
    ctx.stroke();

    const topOpen = gy > 0 && !SOLID.has(room.tiles[gy - 1]?.[gx]);
    if (topOpen) {
      ctx.fillStyle = palette.snow;
      ctx.fillRect(x + 1, y + 1, TILE - 2, 5);
      ctx.fillStyle = "rgba(118,215,255,0.18)";
      ctx.fillRect(x + 1, y + 6, TILE - 2, 2);
    }
  }

  function drawCrumblePlatform(x, y, gx, gy, time) {
    const block = room.entities.crumble?.get(`${gx}:${gy}`);
    const armed = block ? block.timer / CRUMBLE_BREAK_TIME : 0;
    const danger = armed > 0 ? 1 - armed : 0;
    const jitter = armed > 0 ? Math.sin(time * 50 + gx) * (1 - armed) * 1.3 : 0;
    ctx.save();
    ctx.translate(jitter, 0);
    const grad = ctx.createLinearGradient(x, y, x + TILE, y + TILE);
    grad.addColorStop(0, "#e7f4f7");
    grad.addColorStop(0.42, "#76d7ff");
    grad.addColorStop(1, "#294e64");
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
    ctx.fillStyle = `rgba(255,255,255,${0.28 + armed * 0.16})`;
    ctx.fillRect(x + 3, y + 3, TILE - 6, 4);
    if (armed > 0) {
      ctx.fillStyle = "rgba(7,12,20,0.52)";
      ctx.fillRect(x + 4, y + TILE - 7, TILE - 8, 3);
      ctx.fillStyle = `rgba(255,101,125,${0.62 + danger * 0.24})`;
      ctx.fillRect(x + 4, y + TILE - 7, (TILE - 8) * danger, 3);
    }
    ctx.strokeStyle = armed > 0 ? "rgba(255,101,125,0.62)" : "rgba(248,251,255,0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 7);
    ctx.lineTo(x + 14 + armed * 5, y + 17);
    ctx.lineTo(x + 10, y + 28);
    ctx.moveTo(x + 22, y + 6);
    ctx.lineTo(x + 16 - armed * 4, y + 18);
    ctx.lineTo(x + 25, y + 28);
    if (armed > 0) {
      ctx.moveTo(x + 5, y + 22);
      ctx.lineTo(x + 13 + danger * 7, y + 24);
      ctx.moveTo(x + 19, y + 10);
      ctx.lineTo(x + 28, y + 18 + danger * 4);
    }
    ctx.stroke();
    if (armed > 0) {
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
      const flicker = Math.sin(time * 5 + i) * 1.5;
      ctx.fillStyle = palette.hot;
      ctx.beginPath();
      ctx.moveTo(sx, TILE - 6);
      ctx.lineTo(sx + 5.5, 5 + flicker);
      ctx.lineTo(sx + 11, TILE - 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
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
    ctx.shadowBlur = settings.calmEffects ? 5 : 11;
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
    ctx.shadowBlur = settings.calmEffects ? 6 : 12;
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
    if (!settings.practiceLines) return;
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
    ctx.shadowBlur = settings.calmEffects ? 4 : 9;
    ctx.beginPath();
    path.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < path.length; i += 8) {
      const point = path[i];
      const pulse = 1 + Math.sin(time * 5 + i) * 0.16;
      ctx.globalAlpha = alpha * (point.dash || point.spark || point.over ? 0.72 : 0.42);
      ctx.fillStyle = point.over ? palette.green : point.spark ? "#fff0a0" : point.dash ? palette.cyan : palette.gold;
      ctx.fillRect(point.x - 2 * pulse, point.y - 2 * pulse, 4 * pulse, 4 * pulse);
    }
    ctx.restore();
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
      const pulse = 0.7 + Math.sin(time * 5) * 0.12;
      ctx.save();
      ctx.translate(checkpoint.x, checkpoint.y);
      ctx.fillStyle = `rgba(143, 227, 155, ${0.26 + pulse * 0.14})`;
      ctx.fillRect(-18, -26, 36, 48);
      ctx.fillStyle = palette.green;
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(12, -6);
      ctx.lineTo(0, 12);
      ctx.lineTo(-12, -6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (const spring of room.entities.springs) {
      const squash = spring.pulse > 0 ? 5 : 0;
      ctx.fillStyle = "#1c2e2f";
      ctx.fillRect(spring.x + 4, spring.y + 8, spring.w - 8, 7 + squash);
      ctx.fillStyle = palette.green;
      ctx.fillRect(spring.x + 6, spring.y + squash, spring.w - 12, 8);
      ctx.fillStyle = "#f8fbff";
      ctx.fillRect(spring.x + 10, spring.y + 2 + squash, spring.w - 20, 2);
    }

    for (const lumen of room.entities.lumens) {
      if (lumen.taken) continue;
      drawDiamond(lumen.x, lumen.y + Math.sin(lumen.bob) * 4, 11, palette.gold, time);
    }

    for (const refill of room.entities.refills) {
      if (!refill.ready) {
        ctx.save();
        ctx.globalAlpha = 0.18;
        drawDiamond(refill.x, refill.y, 13, palette.cyan, time);
        ctx.restore();
        continue;
      }
      drawDiamond(refill.x, refill.y + Math.sin(refill.bob) * 4, 14, palette.cyan, time);
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
      const goal = room.entities.goal;
      drawDiamond(goal.x, goal.y + Math.sin(time * 4) * 5, 19, "#fff0a0", time);
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(time * 5) * 0.08;
      ctx.fillStyle = palette.gold;
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawUpdraft(updraft, time) {
    const pulse = updraft.pulse > 0 ? updraft.pulse / 0.26 : 0;
    const x = updraft.x + updraft.w / 2;
    const top = Math.max(0, updraft.y - TILE * 2.4);
    const bottom = updraft.y + updraft.h * 0.75;
    ctx.save();
    const field = ctx.createLinearGradient(0, top, 0, bottom);
    field.addColorStop(0, `rgba(118,215,255,${0.03 + pulse * 0.04})`);
    field.addColorStop(0.5, `rgba(118,215,255,${0.09 + pulse * 0.08})`);
    field.addColorStop(1, "rgba(118,215,255,0)");
    ctx.fillStyle = field;
    ctx.fillRect(updraft.x - 10, top, updraft.w + 20, bottom - top);
    ctx.globalAlpha = 0.24 + pulse * 0.2;
    ctx.strokeStyle = "rgba(248,251,255,0.72)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.moveTo(updraft.x - 7, bottom);
    ctx.lineTo(updraft.x - 7, top + 12);
    ctx.moveTo(updraft.x + updraft.w + 7, bottom);
    ctx.lineTo(updraft.x + updraft.w + 7, top + 12);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.26 + pulse * 0.22;
    ctx.strokeStyle = palette.cyan;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.shadowColor = palette.cyan;
    ctx.shadowBlur = settings.calmEffects ? 4 : 9;
    for (let i = -1; i <= 1; i++) {
      const wave = Math.sin(time * 4.2 + i * 1.7 + updraft.bob) * 5;
      ctx.beginPath();
      ctx.moveTo(x + i * 8 + wave, bottom);
      ctx.bezierCurveTo(x + i * 11 - wave, bottom - 38, x + i * 5 + wave, top + 44, x + i * 10, top);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const y = bottom - 30 - i * 42 + Math.sin(time * 3 + i + updraft.bob) * 5;
      ctx.globalAlpha = 0.22 + pulse * 0.2;
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 7);
      ctx.lineTo(x, y - 4);
      ctx.lineTo(x + 10, y + 7);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(248,251,255,0.72)";
    ctx.beginPath();
    ctx.moveTo(x, top - 4 - pulse * 4);
    ctx.lineTo(x + 9, top + 10);
    ctx.lineTo(x + 3, top + 8);
    ctx.lineTo(x + 3, top + 23);
    ctx.lineTo(x - 3, top + 23);
    ctx.lineTo(x - 3, top + 8);
    ctx.lineTo(x - 9, top + 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawRelay(relay, time) {
    const y = relay.y + Math.sin(relay.bob) * 3;
    const active = relay.ready ? 1 : 0.28;
    const pulse = relay.pulse > 0 ? relay.pulse / 0.3 : 0;
    ctx.save();
    ctx.translate(relay.x, y);
    ctx.globalAlpha = 0.42 + active * 0.44;
    ctx.shadowColor = palette.cyan;
    ctx.shadowBlur = relay.ready ? 20 : 7;
    ctx.strokeStyle = relay.ready ? palette.cyan : "rgba(118, 215, 255, 0.42)";
    ctx.lineWidth = 3;
    ctx.rotate(time * 1.2);
    ctx.beginPath();
    ctx.arc(0, 0, 14 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(-time * 2.1);
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
    } else {
      ctx.globalAlpha = 0.24 + pulse * 0.3;
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
    const y = prism.y + Math.sin(prism.bob) * 3;
    const active = prism.ready ? 1 : 0.22;
    const pulse = prism.pulse > 0 ? prism.pulse / 0.5 : 0;
    ctx.save();
    ctx.translate(prism.x, y);
    ctx.globalAlpha = 0.32 + active * 0.58;
    ctx.shadowColor = palette.gold;
    ctx.shadowBlur = prism.ready ? 18 : 6;
    ctx.rotate(-time * 1.35);
    ctx.strokeStyle = prism.ready ? palette.gold : "rgba(247, 198, 93, 0.34)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -15 - pulse * 8);
    ctx.lineTo(14 + pulse * 6, 0);
    ctx.lineTo(0, 15 + pulse * 8);
    ctx.lineTo(-14 - pulse * 6, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.rotate(time * 2.4);
    ctx.fillStyle = prism.ready ? "rgba(255,240,160,0.7)" : "rgba(255,240,160,0.2)";
    ctx.fillRect(-4, -4, 8, 8);
    if (!prism.ready) {
      drawCooldownRing(0, 0, 22, 1 - prism.timer / PRISM_RESET_TIME, palette.gold);
    } else {
      ctx.globalAlpha = 0.28 + pulse * 0.24;
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-22, -8);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-22, 8);
      ctx.moveTo(22, -8);
      ctx.lineTo(14, 0);
      ctx.lineTo(22, 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAnchor(anchor, time) {
    const active = echoAnchor && echoAnchor.room === roomIndex && Math.abs(echoAnchor.x + player.w / 2 - anchor.x) < 2;
    const pulse = Math.max(anchor.pulse / 0.3, recallPulseTimer / 0.42);
    ctx.save();
    ctx.translate(anchor.x, anchor.y);
    ctx.globalAlpha = active ? 0.9 : 0.55;
    ctx.shadowColor = palette.green;
    ctx.shadowBlur = active ? 15 : 7;
    ctx.strokeStyle = active ? palette.green : "rgba(143,227,155,0.62)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 14 + pulse * 8 + Math.sin(time * 4) * 1.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.stroke();
    if (active) {
      ctx.fillStyle = "rgba(143,227,155,0.42)";
      ctx.fillRect(-3, -3, 6, 6);
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

  function drawDeathMarks(time) {
    for (const mark of deathMarks) {
      if (mark.room !== roomIndex) continue;
      const t = Math.max(0, mark.life / mark.max);
      ctx.save();
      ctx.globalAlpha = t * 0.62;
      ctx.translate(mark.x, mark.y);
      ctx.rotate(time * 1.8);
      const color = deathReasonColor(mark.reason);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-7, -7);
      ctx.lineTo(7, 7);
      ctx.moveTo(7, -7);
      ctx.lineTo(-7, 7);
      ctx.stroke();
      ctx.save();
      ctx.rotate(-time * 1.8);
      ctx.font = "600 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.shadowColor = "rgba(0,0,0,0.72)";
      ctx.shadowBlur = 8;
      ctx.fillText(deathReasonLabel(mark.reason), 0, -22);
      if (
        failureCueTimer > 0 &&
        failureCueRoom === mark.room &&
        Math.hypot(mark.x - failureCueX, mark.y - failureCueY) < 4
      ) {
        ctx.font = "600 8px system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,240,160,0.9)";
        ctx.fillText("REHEARSE", 0, 24);
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(248,251,255,0.72)";
      ctx.beginPath();
      ctx.arc(0, 0, 12 + (1 - t) * 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawFailureGhostLine(time) {
    if (failureCueTimer <= 0 || failureCueRoom !== roomIndex || failureCuePath.length < 2) return;
    const t = Math.max(0, Math.min(1, failureCueTimer / Math.max(0.001, failureCueMax)));
    const color = deathReasonColor(failureCueReason);
    const alpha = Math.min(0.62, 0.18 + t * 0.46);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([12, 9]);
    ctx.shadowColor = color;
    ctx.shadowBlur = settings.calmEffects ? 5 : 12;
    ctx.beginPath();
    failureCuePath.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    const last = failureCuePath[failureCuePath.length - 1];
    const pulse = 0.5 + Math.sin(time * 8) * 0.5;
    ctx.globalAlpha = Math.min(0.82, alpha + pulse * 0.14);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 5 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawFailureGhostArrow(failureCuePath, color, alpha, time);
  }

  function drawFailureGhostArrow(path, color, alpha, time) {
    if (!Array.isArray(path) || path.length < 2) return;
    const end = path[path.length - 1];
    let start = null;
    for (let i = path.length - 2; i >= 0; i -= 1) {
      const candidate = path[i];
      if (Math.hypot(end.x - candidate.x, end.y - candidate.y) > 7) {
        start = candidate;
        break;
      }
    }
    if (!start) return;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const pulse = 0.5 + Math.sin(time * 8.4) * 0.5;
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.rotate(angle);
    ctx.globalAlpha = Math.min(0.9, alpha + pulse * 0.18);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = settings.calmEffects ? 4 : 10;
    ctx.beginPath();
    ctx.moveTo(13 + pulse * 2, 0);
    ctx.lineTo(-5, -7);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFailureRehearsalCue(time) {
    if (!started || won || !failureCueActive()) return;
    const t = Math.max(0, Math.min(1, failureCueTimer / Math.max(0.001, failureCueMax)));
    const alpha = Math.min(1, t * 1.55);
    const color = deathReasonColor(failureCueReason);
    const routeColor = routeSlotColor(routeSlotForMode(failureCueMode));
    const cardWidth = isCompactCanvas() ? 330 : 300;
    const cardHeight = 78;
    const px = Math.max(24, Math.min(W - 24, failureCueX));
    const py = Math.max(34, Math.min(H - 34, failureCueY));
    const cardX = Math.max(18, Math.min(W - cardWidth - 18, px - cardWidth / 2));
    const preferredY = py < H * 0.45 ? py + 30 : py - cardHeight - 32;
    const cardY = Math.max(44, Math.min(H - cardHeight - 42, preferredY));
    const pulse = 0.5 + Math.sin(time * 7.2) * 0.5;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = settings.calmEffects ? 5 : 13;
    ctx.beginPath();
    ctx.arc(px, py, 18 + pulse * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.6;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(cardX + cardWidth / 2, cardY + cardHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = alpha * 0.88;
    ctx.fillStyle = "rgba(7,12,20,0.76)";
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 8);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    roundRect(ctx, cardX + 0.7, cardY + 0.7, cardWidth - 1.4, cardHeight - 1.4, 8);
    ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillStyle = color;
    ctx.fillText(fitText(failureCueText, cardWidth - 28), cardX + 14, cardY + 18);
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.shadowBlur = settings.calmEffects ? 2 : 6;
    ctx.fillStyle = "rgba(248,251,255,0.78)";
    ctx.fillText(fitText(failureCueDetail, cardWidth - 28), cardX + 14, cardY + 42);
    ctx.fillStyle = routeColor;
    ctx.fillText(fitText(`${failureRehearsalPlanText(roomIndex, failureCueMode)} / ${nextMasteryStepText(roomIndex)}`, cardWidth - 28), cardX + 14, cardY + 62);
    drawRouteSegmentStrip(cardX + cardWidth - 98, cardY + 12, 78, 9, routeSlotForMode(failureCueMode));
    ctx.restore();

    drawFailureRouteArrow(time, routeColor, alpha);
  }

  function drawFailureRouteArrow(time, color, alpha) {
    if (player.deadTimer > 0) return;
    const target = routeCompassTarget();
    if (!target) return;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    let dx = target.x - cx;
    let dy = target.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 36) return;
    dx /= dist;
    dy /= dist;
    const length = Math.min(118, Math.max(54, dist * 0.24));
    const sx = cx + dx * 24;
    const sy = cy + dy * 18;
    const ex = sx + dx * length;
    const ey = sy + dy * length;
    const pulse = 0.5 + Math.sin(time * 6.8) * 0.5;

    ctx.save();
    ctx.globalAlpha = Math.min(0.72, alpha * (0.36 + pulse * 0.18));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = settings.calmEffects ? 4 : 11;
    ctx.setLineDash([9, 7]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.translate(ex, ey);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-7, -6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-Math.atan2(dy, dx));
    ctx.font = "600 8px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = Math.min(0.86, alpha * 0.72);
    ctx.fillStyle = "rgba(7,12,20,0.72)";
    roundRect(ctx, -34, -28, 68, 16, 5);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText("修正路线", 0, -20);
    ctx.restore();
  }

  function drawDeathReplays() {
    for (const replay of deathReplays) {
      if (replay.room !== roomIndex || replay.points.length < 2) continue;
      const fade = Math.max(0, replay.life / replay.max);
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 3;
      const color = deathReasonColor(replay.reason);
      ctx.strokeStyle = color === palette.hot ? `rgba(255, 92, 108, ${0.2 + fade * 0.38})` : `rgba(118, 215, 255, ${0.2 + fade * 0.38})`;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      replay.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
      for (let i = 0; i < replay.points.length; i += 2) {
        const point = replay.points[i];
        ctx.globalAlpha = fade * (point.dash || point.spark ? 0.76 : 0.42);
        ctx.fillStyle = point.spark ? "#fff0a0" : point.dash ? palette.cyan : palette.hot;
        ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
      }
      ctx.restore();
    }
  }

  function drawDiamond(x, y, radius, color, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 1.4);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
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
    const spawn = visualRatio("spawn", 0.32);
    const death = visualRatio("death", 0.28);
    const land = visualRatio("land", 0.18);
    const wall = visualRatio("wall", 0.22);
    const strongest = Math.max(dash, spark, relay, prism, spring, recall, spawn, death, wall);

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
          : spring > 0 || recall > 0 || spawn > 0 ? palette.green
            : death > 0 ? palette.hot
              : palette.cyan;
    const radius = 18 + strongest * 18 + Math.sin(time * 20) * 1.4;
    ctx.save();
    ctx.globalAlpha = 0.12 + strongest * 0.32;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = settings.calmEffects ? 8 : 18;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (dash > 0) {
      const dx = player.dashDirX || player.facing;
      const dy = player.dashDirY || 0;
      ctx.globalAlpha = 0.18 + dash * 0.4;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - dx * 32, cy - dy * 32);
      ctx.lineTo(cx - dx * 7, cy - dy * 7);
      ctx.stroke();
    }
    if (wall > 0) {
      const side = player.wallJumpLock > 0 ? -player.facing : player.wallDir || player.wallCoyoteDir || -player.facing;
      ctx.globalAlpha = 0.18 + wall * 0.38;
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
      ctx.globalAlpha = ghost.alpha * t * 0.82;
      ctx.translate(cx, cy);
      ctx.scale(1 + (1 - t) * 0.12, 1 + (1 - t) * 0.06);
      ctx.translate(-cx, -cy);
      ctx.fillStyle = "#79e4ff";
      roundRect(ctx, ghost.x + 4, ghost.y + 8, player.w - 8, 14, 3);
      ctx.fill();
      ctx.fillStyle = "#fff0a0";
      ctx.fillRect(ghost.x + 7, ghost.y + 4, 7, 7);
      ctx.restore();
    }
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
    const dashPulse = Math.max(visualRatio("dash", 0.24), player.dashTimer / DASH_TIME);
    const sparkPulse = visualRatio("spark", 0.28);
    const prismPulse = visualRatio("prism", 0.42);
    const relayPulse = visualRatio("relay", 0.34);
    const springPulse = visualRatio("spring", 0.24);
    const recallPulse = visualRatio("recall", 0.34);
    const spawnPulse = visualRatio("spawn", 0.32);
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
    const hairColor = over ? "#8fe39b" : player.dashes > 0 ? "#ff657d" : "#78cfff";
    const squashX = 1 + landPulse * 0.16 + dashPulse * 0.08 - springPulse * 0.05;
    const squashY = 1 - landPulse * 0.14 - dashPulse * 0.06 + Math.max(sparkPulse, springPulse) * 0.1;
    const lean = Math.max(-0.22, Math.min(0.22, player.vx / 980 + dashPulse * player.dashDirX * 0.12 + wallPulse * player.facing * 0.05));
    const eyeX = x + 11 + player.facing * 2;

    ctx.save();

    if (over || prismPulse > 0 || recallPulse > 0 || spawnPulse > 0) {
      const glow = Math.max(prismPulse, recallPulse, spawnPulse, over ? 0.18 : 0);
      ctx.globalAlpha = 0.12 + glow * 0.28 + Math.sin(time * 18) * 0.03;
      ctx.strokeStyle = prismPulse > 0 ? palette.gold : recallPulse > 0 || spawnPulse > 0 ? palette.green : palette.gold;
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 19 + glow * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = player.hair.length - 1; i > 0; i--) {
      const a = player.hair[i - 1];
      const b = player.hair[i];
      const fade = 1 - i / player.hair.length;
      ctx.strokeStyle = charged
        ? `rgba(255, 240, 160, ${0.25 + fade * 0.48})`
        : `rgba(255, 190, 87, ${0.2 + fade * 0.36})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y + 1);
      ctx.lineTo(b.x, b.y + 1);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, y + player.h + 4, 14 + run * 3 + landPulse * 5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(lean);
    ctx.scale(squashX, squashY);
    ctx.translate(-cx, -cy);

    if (charged) {
      ctx.globalAlpha = 0.22 + Math.max(dashPulse, sparkPulse, relayPulse, prismPulse) * 0.28;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.ellipse(cx - player.facing * 4, y + 16, 13, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = walling || wallPulse > 0.3 ? palette.green : "#ffc857";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const armReach = walling ? player.wallDir * 11 : -player.facing * (7 + dashPulse * 3);
    ctx.moveTo(cx - player.facing * 1, y + 11);
    ctx.lineTo(cx + armReach, y + 14 + step * 1.2);
    ctx.stroke();

    ctx.strokeStyle = dashPulse > 0 ? palette.cyan : "#d8ecff";
    ctx.beginPath();
    ctx.moveTo(cx + player.facing * 3, y + 11);
    ctx.lineTo(cx + player.facing * (7 + dashPulse * 4), y + 15 - step);
    ctx.stroke();

    ctx.fillStyle = "#25364a";
    roundRect(ctx, x + 5 - player.facing, y + 10, 7, 12, 2);
    ctx.fill();

    ctx.fillStyle = coatDark;
    roundRect(ctx, x + 5, y + 8, 10, 15, 3);
    ctx.fill();
    ctx.fillStyle = coat;
    roundRect(ctx, x + 4, y + 7, 11, 14, 3);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(x + 4, y + 12, 11, 2);
    ctx.fillStyle = "#e9f7ff";
    ctx.fillRect(x + 6, y + 9, 7, 2);
    ctx.fillStyle = "rgba(255,255,255,0.24)";
    ctx.fillRect(x + 6, y + 12, 2, 7);

    ctx.strokeStyle = "#172233";
    ctx.lineWidth = 4;
    ctx.beginPath();
    const legKick = airborne ? Math.sign(player.vy || 1) * 1.6 : step * 2.4;
    ctx.moveTo(x + 7, y + 21);
    ctx.lineTo(x + 5 + legKick, y + 28);
    ctx.moveTo(x + 13, y + 21);
    ctx.lineTo(x + 15 - legKick, y + 28);
    ctx.stroke();
    ctx.fillStyle = "#0f1927";
    ctx.fillRect(x + 2 + legKick, y + 27, 7, 3);
    ctx.fillRect(x + 12 - legKick, y + 27, 7, 3);

    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(x + 5 - dashPulse * player.facing * 2, y + 4);
    ctx.lineTo(x + 15, y + 3 - Math.max(sparkPulse, springPulse) * 2);
    ctx.lineTo(x + 17 + player.facing, y + 10);
    ctx.lineTo(x + 10, y + 13);
    ctx.lineTo(x + 4, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(x + 7, y + 4, 5, 1);

    ctx.fillStyle = "#ffe0bd";
    roundRect(ctx, x + 7 + player.facing, y + 5, 8, 8, 2);
    ctx.fill();
    ctx.fillStyle = "#1b2533";
    ctx.fillRect(eyeX, y + 8, 2, 2);

    ctx.fillStyle = "#fff0a0";
    ctx.fillRect(cx - player.facing * 2, y + 12, 4, 3);
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.fillRect(x + 8, y + 7, 3, 1);

    if (walling) {
      ctx.fillStyle = palette.green;
      ctx.fillRect(cx + player.wallDir * 12, y + 14, 3, 3);
      ctx.fillRect(cx + player.wallDir * 10, y + 18, 2, 2);
    }

    ctx.restore();
    ctx.restore();
  }
  function drawParticles() {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.max);
      ctx.save();
      ctx.globalAlpha = alpha;
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
    grad.addColorStop(1, "rgba(0,0,0,0.35)");
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

  function updateHud() {
    const found = collected.size;
    const roomBest = bestRoomTimes[roomIndex] || 0;
    const grade = splitGrade(roomBest, ROOM_TARGETS[roomIndex]);
    lumenCount.textContent = `${found}/${totalLumens}`;
    roomCount.textContent = `${roomIndex + 1}/${maps.length}${grade ? ` ${grade}` : ""}`;
    splitTimeText.textContent = formatTime(roomTime);
    const splitReference = roomBest || ROOM_TARGETS[roomIndex] || 0;
    const splitDelta = splitReference > 0 ? roomTime - splitReference : 0;
    if (splitDeltaText) {
      splitDeltaText.textContent = splitReference > 0 ? formatDelta(splitDelta) : "--";
      splitDeltaText.title = roomBest > 0 ? "room PB delta" : "target delta";
    }
    if (flowCountText) flowCountText.textContent = `F ${Math.floor(flowPeak || flowScore)}`;
    if (flowCountText) flowCountText.title = `${flowTierLabel(flowPeak || flowScore)} flow`;
    updatePracticeCoach();
    runTimeText.textContent = formatTime(runTime);
    deathCountText.textContent = `D ${deathCount}`;
    splitTimeText.classList.toggle("best", roomBest > 0 && roomTime > 0 && roomTime <= roomBest);
    splitDeltaText?.classList.toggle("best", splitReference > 0 && splitDelta <= 0);
    splitDeltaText?.classList.toggle("behind", splitReference > 0 && splitDelta > 0);
    flowCountText?.classList.toggle("best", bestFlow > 0 && Math.floor(flowPeak) >= Math.floor(bestFlow));
    runTimeText.classList.toggle("best", bestTime > 0 && runTime > 0 && runTime <= bestTime);
    dashFill.style.transform = `scaleX(${player.dashes > 0 ? 1 : 0.12})`;
    staminaFill.style.transform = `scaleX(${Math.max(0.08, player.stamina / MAX_STAMINA)})`;
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

  function formatTime(value) {
    const totalHundredths = Math.max(0, Math.floor(value * 100));
    const minutes = Math.floor(totalHundredths / 6000);
    const seconds = Math.floor((totalHundredths % 6000) / 100);
    const hundredths = totalHundredths % 100;
    return `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
  }

  function formatDelta(value) {
    const sign = value <= 0 ? "-" : "+";
    const totalHundredths = Math.floor(Math.abs(value) * 100);
    const seconds = Math.floor(totalHundredths / 100);
    const hundredths = totalHundredths % 100;
    return `${sign}${seconds}.${String(hundredths).padStart(2, "0")}`;
  }

  function splitGrade(best, target) {
    if (!best || !target) return "";
    if (best <= target) return "S";
    if (best <= target * 1.25) return "A";
    if (best <= target * 1.6) return "B";
    return "C";
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
      `failure ${failureCueText || "none"} ${failureCueTimer.toFixed(2)}  mode ${failureCueMode}  room ${failureCueRoom + 1}`,
      `tip ${gameTipKind || "none"} ${gameTipTimer.toFixed(2)}  onboarding ${onboardingStep}`,
      `relay chain ${relayChain}  best ${bestRelayChain}`,
      `flow ${Math.floor(flowScore)} peak ${Math.floor(flowPeak)} best ${Math.floor(bestFlow)}  deaths ${deathCount}`,
      `last death ${lastDeathReason === "none" ? "none" : deathReasonLabel(lastDeathReason)}  reasons ${deathReasonSummary()}`,
      `room focus ${roomFocusDetails(roomIndex)}`,
      `coach ${practiceCoachText()}`,
      `stamina ${(player.stamina * 100).toFixed(0)}  anchor ${echoAnchor && echoAnchor.room === roomIndex ? 1 : 0}`,
      `hitstop ${hitStopTimer.toFixed(3)}  ghosts ${ghosts.length}`,
      `trails ${lightTrails.length}  relays ${room.entities.relays.length}  prisms ${room.entities.prisms.length}  up ${room.entities.updrafts.length}  crumble ${crumble.active}/${crumble.total}`,
      `paths room ${roomPath.length}  best ${Array.isArray(bestRoomPaths[roomIndex]) ? bestRoomPaths[roomIndex].length : 0}  lines ${settings.practiceLines ? 1 : 0}  ghost ${settings.ghostOpacity.toFixed(2)}`,
      `shake ${settings.shake.toFixed(2)}  keys ${settings.controlsPreset}  grab ${settings.grabMode}${grabLatched ? " latched" : ""}  pad dz ${settings.gamepadDeadzone.toFixed(2)}`,
      `audio ${settings.audioEnabled ? settings.audioVolume.toFixed(2) : "off"}  route ${activeRouteContract ? `${activeRouteContract.id}:${activeRouteContract.step + 1}` : "none"}`
    ].join("\n");
  }

  function tileAt(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return "#";
    return room.tiles[y][x];
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function distRectPoint(rect, x, y) {
    const dx = Math.max(rect.x - x, 0, x - (rect.x + rect.w));
    const dy = Math.max(rect.y - y, 0, y - (rect.y + rect.h));
    return Math.hypot(dx, dy);
  }

  function approach(value, target, amount) {
    if (value < target) return Math.min(value + amount, target);
    if (value > target) return Math.max(value - amount, target);
    return target;
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
