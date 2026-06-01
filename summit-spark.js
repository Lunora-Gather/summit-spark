(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const startButton = document.getElementById("startButton");
  const overlay = document.getElementById("overlay");
  const lumenCount = document.getElementById("lumenCount");
  const roomCount = document.getElementById("roomCount");
  const splitTimeText = document.getElementById("splitTime");
  const splitDeltaText = document.getElementById("splitDelta");
  const flowCountText = document.getElementById("flowCount");
  const runTimeText = document.getElementById("runTime");
  const deathCountText = document.getElementById("deathCount");
  const debugPanel = document.getElementById("debugPanel");
  const settingsButton = document.getElementById("settingsButton");
  const settingsPanel = document.getElementById("settingsPanel");
  const settingsCloseButton = document.getElementById("settingsClose");
  const shakeSlider = document.getElementById("shakeSlider");
  const debugToggle = document.getElementById("debugToggle");
  const calmEffectsToggle = document.getElementById("calmEffectsToggle");
  const practiceLinesToggle = document.getElementById("practiceLinesToggle");
  const ghostOpacitySlider = document.getElementById("ghostOpacitySlider");
  const controlPresetSelect = document.getElementById("controlPreset");
  const roomSelect = document.getElementById("roomSelect");
  const roomBrief = document.getElementById("roomBrief");
  const focusRoomButton = document.getElementById("focusRoomButton");
  const focusResetButton = document.getElementById("focusResetButton");
  const coachSummary = document.getElementById("coachSummary");
  const practiceReport = document.getElementById("practiceReport");
  const practiceQueue = document.getElementById("practiceQueue");
  const practiceLedger = document.getElementById("practiceLedger");
  const drillCleanButton = document.getElementById("drillCleanButton");
  const drillPaceButton = document.getElementById("drillPaceButton");
  const drillStyleButton = document.getElementById("drillStyleButton");
  const drillExpertButton = document.getElementById("drillExpertButton");
  const dashFill = document.querySelector(".dash-meter span");
  const staminaFill = document.querySelector(".stamina-meter span");

  const W = canvas.width;
  const H = canvas.height;
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
  const CORNER_CORRECTION = 6;
  const DASH_CORNER_CORRECTION = 5;
  const WALL_NEUTRAL_X = 230;
  const WALL_CLIMB_X = 170;
  const WALL_JUMP_LOCK_TIME = 0.09;
  const WALL_COYOTE_TIME = 0.105;
  const FAST_FALL_MAX = 900;
  const FAST_FALL_GRAVITY_MULT = 1.42;
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
  const PATH_SAMPLE_INTERVAL = 0.045;
  const RECENT_PATH_SECONDS = 1.55;
  const DEATH_REPLAY_LIFE = 5.2;
  const MAX_ROOM_PATH_POINTS = 420;
  const ROOM_BEST_FLASH_TIME = 1.15;
  const SPLIT_POPUP_TIME = 1.25;
  const FOCUS_POPUP_TIME = 1.35;
  const SETTINGS_KEY = "summit-spark-settings";
  const ACTION_PULSE_TIME = 0.22;
  const BEST_FLOW_KEY = "summit-spark-best-flow";
  const FLOW_DECAY_TIME = 1.9;
  const FLOW_DECAY_RATE = 38;
  const FLOW_POPUP_TIME = 0.62;
  const NEAR_MISS_COOLDOWN = 0.48;
  const ECHO_RECALL_COOLDOWN = 0.32;
  const ROOM_INTRO_TIME = 1.2;
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
    ["安全线：折返时保留一次冲刺", "进阶线：用光继点进上层平台", "高手线：不靠中段平台恢复"],
    ["安全线：弹簧重置出口节奏", "进阶线：弹簧前先穿过光继点", "高手线：一整句动作进入上出口"],
    ["安全线：脆冰只踩一下就走", "进阶线：用风代替中段落地", "高手线：风中不停顿接光继点"],
    ["安全线：站稳后再吃棱镜", "进阶线：过载穿过脆冰排", "高手线：落地前先选棱镜路线"],
    ["安全线：连段前先点亮回声", "进阶线：风接棱镜再接光继点", "高手线：只在保 PB 时召回"],
    ["安全线：每次重置都明确花掉", "进阶线：棱镜穿中线", "高手线：完整工具组连到终点落地"]
  ];
  const ROOM_STYLE_TRIALS = [
    { kind: "precision", label: "落点精度", goal: "干净落点后用 Spark 越过危险", clean: true, tech: ["spark"], timeScale: 1.55 },
    { kind: "recovery", label: "恢复控制", goal: "触发光继后稳住下一次落点", clean: true, tech: ["relay"], timeScale: 1.45 },
    { kind: "timing", label: "弹簧节拍", goal: "弹簧给高度，Spark 省掉等待", clean: true, tech: ["spring", "spark"], timeScale: 1.5 },
    { kind: "chain", label: "连锁节奏", goal: "把三段光继连成一句动作", clean: false, tech: ["relayChain"], timeScale: 1.45 },
    { kind: "route", label: "路线选择", goal: "折返时用光继进上层路线", clean: true, tech: ["relay"], timeScale: 1.45 },
    { kind: "exit", label: "出口节拍", goal: "光继接弹簧，把出口动作收干净", clean: true, tech: ["relay", "spring"], timeScale: 1.4 },
    { kind: "terrain", label: "地形风险", goal: "脆冰只借一步，立刻进风场", clean: false, tech: ["crumble", "updraft"], timeScale: 1.35 },
    { kind: "risk", label: "过载风险", goal: "棱镜过载穿过脆冰排", clean: false, tech: ["prism", "crumble"], timeScale: 1.35 },
    { kind: "reading", label: "回声读图", goal: "先建回声锚点，再召回重接路线", clean: false, tech: ["echo", "recall"], timeScale: 1.55 },
    { kind: "endurance", label: "终盘耐压", goal: "光继、棱镜、脆冰连续收束到终点", clean: false, tech: ["relay", "prism", "crumble"], timeScale: 1.35 }
  ];
  const EXPERT_REQUIREMENTS = [
    ["spark"],
    ["relay"],
    ["spark", "spring"],
    ["relayChain"],
    ["relay"],
    ["relay", "spring"],
    ["updraft", "crumble"],
    ["prism", "crumble"],
    ["echo", "updraft", "prism"],
    ["relay", "prism", "crumble"]
  ];
  const EXPERT_REQUIREMENT_LABELS = {
    spark: "Spark",
    relay: "光继",
    relayChain: "连锁x3",
    spring: "弹簧",
    updraft: "风",
    prism: "棱镜",
    echo: "回声锚点",
    recall: "召回",
    crumble: "脆冰"
  };

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
  let collected = new Set();
  let debugVisible = false;
  let hitStopTimer = 0;
  let shakeTimer = 0;
  let shakeDuration = 0;
  let shakePower = 0;
  let fps = 60;
  let settingsVisible = false;
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
  let focusPopupTimer = 0;
  let focusPopupText = "";
  let focusPopupDetail = "";
  let lastCoachSummary = "";
  let lastPracticeQueueHtml = "";
  let lastPracticeLedgerHtml = "";
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
  let timingArmed = false;
  let timingInputReady = false;
  let roomTech = createRoomTech();
  const settings = readSettings();
  const actionPulse = {
    jump: 0,
    dash: 0,
    grab: 0,
    fall: 0,
    wall: 0
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
    wallJumpLock: 0,
    deadTimer: 0,
    respawnRoom: 0,
    respawnX: 0,
    respawnY: 0,
    hair: []
  };

  resetToStart(0);
  seedHair();
  updateHud();
  canvas.tabIndex = 0;

  window.addEventListener("keydown", (event) => {
    const uiControl = isSettingsInputTarget(event.target);
    if (settingsVisible && event.code === "Escape") {
      event.preventDefault();
      if (event.repeat) return;
      closeSettings();
      return;
    }
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
      && ["INPUT", "SELECT", "BUTTON"].includes(target.tagName);
  }

  function releaseAllInputs() {
    keys.clear();
    pressed.clear();
    touchPressed.clear();
    gamepadPressed.clear();
    gamepadHeld.clear();
    for (const key of Object.keys(touch)) touch[key] = false;
    document.querySelectorAll("[data-touch]").forEach((button) => button.classList.remove("active"));
    player.jumpBuffer = 0;
    player.dashBuffer = 0;
    resetActionPulses();
  }

  canvas.addEventListener("pointerdown", focusGame);
  startButton.addEventListener("click", begin);
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
  practiceLinesToggle?.addEventListener("change", () => {
    settings.practiceLines = practiceLinesToggle.checked;
    writeSettings();
  });
  ghostOpacitySlider?.addEventListener("input", () => {
    settings.ghostOpacity = Number(ghostOpacitySlider.value);
    writeSettings();
  });
  controlPresetSelect?.addEventListener("change", () => {
    settings.controlsPreset = CONTROL_PRESETS[controlPresetSelect.value] ? controlPresetSelect.value : "comfort";
    keys.clear();
    pressed.clear();
    touchPressed.clear();
    gamepadPressed.clear();
    gamepadHeld.clear();
    resetActionPulses();
    writeSettings();
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
    resetFocusStats();
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
    resetActionVisuals();
    triggerActionVisual("spawn", 0.32);
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
    overlay.classList.add("hidden");
    focusGame();
  }

  function hardReset() {
    collected = new Set();
    deathCount = 0;
    deathReasons = createDeathReasons();
    roomMistakes = createRoomCounters();
    roomAttemptClean = true;
    lastDeathReason = "none";
    crumbleSlipTimer = 0;
    clearFocusPopup();
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
    activeDrill = null;
    resetActionPulses();
    overlay.classList.add("hidden");
    resetToStart(0);
    refreshRoomSelectOptions();
    updateHud();
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
    if (!options.keepDrill) activeDrill = null;
    resetActionPulses();
    overlay.classList.add("hidden");
    started = true;
    resetToStart(index);
    roomAttemptClean = true;
    seedHair();
    refreshRoomSelectOptions();
    updateHud();
    focusGame();
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
    if (!timingArmed && timingIntent && timingInputReady) timingArmed = true;
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
      shake(0.055, Math.min(2.4, fallSpeed / 320));
      burst(player.x + player.w / 2, player.y + player.h, "#e9f7ff", 4, 90);
    } else if (!player.wasGrounded && player.onGround && fallSpeed > 180) {
      triggerActionVisual("land", 0.12);
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

    if (player.coyote > 0 || player.wasGrounded) {
      player.vy = -JUMP;
      player.jumpBuffer = 0;
      player.coyote = 0;
      addFlow(4, "jump");
      triggerActionVisual("jump", 0.2);
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
      shake(0.04, 1.35);
      burst(player.x + (wallJumpDir > 0 ? player.w : 0), player.y + player.h * 0.55, climbJump ? palette.green : "#e9f7ff", 9, 190);
    }
  }

  function sparkHop() {
    const dir = player.sparkHopDirX || player.facing;
    if (dir !== 0) {
      player.vx = Math.sign(dir) * Math.max(Math.abs(player.vx), SPARK_HOP_X);
    }
    player.vy = Math.min(player.vy, -SPARK_HOP_Y);
    player.jumpBuffer = 0;
    player.sparkHopTimer = 0;
    player.wallJumpLock = WALL_JUMP_LOCK_TIME;
    markRoomTech("spark");
    addFlow(12, "spark");
    triggerActionVisual("spark", 0.28);
    hitStopTimer = Math.max(hitStopTimer, 0.012);
    burst(player.x + player.w / 2, player.y + player.h / 2, "#f8fbff", 12, 220);
    burst(player.x + player.w / 2, player.y + player.h, palette.cyan, 8, 180);
  }

  function armSparkHop() {
    if (player.wasGrounded || player.onGround || player.deadTimer > 0) return;
    player.sparkHopTimer = SPARK_HOP_WINDOW;
    player.sparkHopDirX = player.dashDirX;
    player.sparkHopDirY = player.dashDirY;
  }

  function startDash(input) {
    let dx = input.x;
    let dy = input.y;
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
    hitStopTimer = Math.max(hitStopTimer, DASH_HITSTOP);
    shake(0.08, 2.4);
    addGhost(0.48);
    spawnLightTrail(dx, dy);
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.cyan, 18, 330);
    for (let i = 0; i < 7; i++) {
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
        player.vy = Math.min(player.vy, -140 - Math.min(90, chain * 18));
        addFlow(22 + chain * 8, chain >= 3 ? "chain" : "relay");
        triggerActionVisual("relay", chain >= 3 ? 0.34 : 0.24);
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
    recordRoomBest(roomIndex);
    markRoomClear(roomIndex);
    const drillResult = completeDrill(roomIndex, clearedClean);
    if (drillResult === false) return { isBest: false, drillResult };
    addFlow(120, "summit");
    if (bestTime <= 0 || runTime < bestTime) {
      bestTime = runTime;
      writeBestTime(bestTime);
      return { isBest: true, drillResult };
    }
    return { isBest: false, drillResult };
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
      return Number(localStorage.getItem(BEST_TIME_KEY) || 0);
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
      return Number(localStorage.getItem(BEST_FLOW_KEY) || 0);
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

  function readRoomBests() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ROOM_BESTS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map((value) => Number(value) || 0) : [];
    } catch {
      return [];
    }
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
    try {
      const parsed = JSON.parse(localStorage.getItem(ROOM_PATHS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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
      recordRoomBest(clearedRoom);
      markRoomClear(clearedRoom);
      const drillResult = completeDrill(clearedRoom, clearedClean);
      if (drillResult === false) return;
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
    resetRelayChain();
    breakFlow();
    clearSplitPopup();
    player.deadTimer = DEATH_RETRY_TIME;
    crumbleSlipTimer = 0;
    hitStopTimer = Math.max(hitStopTimer, DEATH_HITSTOP);
    triggerActionVisual("death", 0.28);
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
    player.wallJumpLock = 0;
    player.overdrive = 0;
    player.ghostTimer = 0;
    player.deadTimer = 0;
    clearSplitPopup();
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
    burst(player.x + player.w / 2, player.y + player.h / 2, "#f8fbff", 16, 230);
  }

  function quickRetry() {
    if (player.deadTimer > 0) return;
    const deathReason = registerDeath("retry");
    addDeathMark(deathReason);
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
      wallJumpLock: 0,
      deadTimer: 0,
      respawnRoom: roomIndex,
      respawnX: target.x,
      respawnY: target.y
    });
    clearSplitPopup();
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

  function createRoomCounters() {
    return Array.from({ length: maps.length }, () => 0);
  }

  function createRoomTech() {
    return {
      spark: false,
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
    const source = Array.isArray(raw) ? raw : [];
    return maps.map((_, index) => {
      const saved = source[index] && typeof source[index] === "object" ? source[index] : {};
      const entry = createRoomFocusEntry();
      entry.faults = Math.max(0, Number(saved.faults) || 0);
      entry.clears = Math.max(0, Number(saved.clears) || 0);
      entry.clean = Math.max(0, Number(saved.clean) || 0);
      entry.drills = Math.max(0, Number(saved.drills) || 0);
      entry.drillClears = Math.max(0, Number(saved.drillClears) || 0);
      entry.drillClean = Math.max(0, Number(saved.drillClean) || 0);
      entry.cleanDrills = Math.max(0, Number(saved.cleanDrills) || 0);
      entry.cleanWins = Math.max(0, Number(saved.cleanWins) || 0);
      entry.paceDrills = Math.max(0, Number(saved.paceDrills) || 0);
      entry.paceWins = Math.max(0, Number(saved.paceWins) || 0);
      entry.styleDrills = Math.max(0, Number(saved.styleDrills) || 0);
      entry.styleWins = Math.max(0, Number(saved.styleWins) || 0);
      entry.expertDrills = Math.max(0, Number(saved.expertDrills) || 0);
      entry.expertWins = Math.max(0, Number(saved.expertWins) || 0);
      entry.last = DEATH_REASON_LABELS[saved.last] ? saved.last : "none";
      DEATH_REASON_KEYS.forEach((key) => {
        entry[key] = Math.max(0, Number(saved[key]) || 0);
      });
      return entry;
    });
  }

  function readRoomFocus() {
    try {
      return normalizeRoomFocus(JSON.parse(localStorage.getItem(ROOM_FOCUS_KEY) || "[]"));
    } catch {
      return normalizeRoomFocus([]);
    }
  }

  function writeRoomFocus() {
    try {
      localStorage.setItem(ROOM_FOCUS_KEY, JSON.stringify(roomFocus));
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

  function roomRouteLine(index, slot) {
    const lines = ROOM_ROUTE_LINES[index] || [];
    return lines[slot] || lines[0] || roomPurposeLabel(index);
  }

  function routeLineCore(index, slot) {
    return roomRouteLine(index, slot).replace(/^(安全线|进阶线|高手线)：/, "");
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

  function startRoomDrill(index, mode = "auto") {
    const resolvedMode = resolveDrillMode(index, mode);
    const objective = drillObjectiveForRoom(index, resolvedMode);
    jumpToRoom(index, { keepDrill: true });
    activeDrill = { room: index, mode: resolvedMode, objective, target: ROOM_TARGETS[index] || 0 };
    trackDrillStart(index, resolvedMode);
    focusPopupText = `${drillModeLabel(resolvedMode)} DRILL R${index + 1}`;
    focusPopupDetail = `${drillTargetText(index, resolvedMode)} / ${objective}`;
    focusPopupTimer = FOCUS_POPUP_TIME;
    updatePracticeCoach();
  }

  function completeDrill(index, clean) {
    if (!activeDrill || activeDrill.room !== index) return null;
    const success = drillSucceeded(activeDrill, clean, roomTime);
    if (success) {
      trackDrillClear(index, clean, activeDrill.mode);
      focusPopupText = `${clean ? "DRILL 无失误" : "DRILL 通过"} R${index + 1}`;
      focusPopupDetail = "目标完成";
      focusPopupTimer = FOCUS_POPUP_TIME;
      activeDrill = null;
      updatePracticeCoach();
      return true;
    }
    retryFailedDrill({ ...activeDrill }, drillFailureText(activeDrill, clean, roomTime));
    return false;
  }

  function retryFailedDrill(drill, reason) {
    jumpToRoom(drill.room, { keepDrill: true });
    activeDrill = drill;
    trackDrillStart(drill.room, drill.mode);
    focusPopupText = `${drillModeLabel(drill.mode)} 重练 R${drill.room + 1}`;
    focusPopupDetail = reason;
    focusPopupTimer = FOCUS_POPUP_TIME;
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
    if (drill.mode === "clean") return "本轮有失误，先跑 safe 线";
    if (drill.mode === "pace") return `用时 ${formatTime(elapsed)} / 目标 ${formatTime(drill.target)}`;
    if (drill.mode === "style") {
      const trial = styleTrialForRoom(drill.room);
      const missing = missingStyleRequirements(drill.room);
      const limit = styleTrialTimeLimit(drill.room);
      if (trial.clean && !clean) return `${styleTrialLabel(drill.room)} 要求无失误`;
      if (missing.length) return `缺类型动作：${missing.map(expertRequirementLabel).join("+")}`;
      if (limit > 0 && elapsed > limit) return `用时 ${formatTime(elapsed)} / 类型 ${formatTime(limit)}`;
      return styleTrialObjective(drill.room);
    }
    if (drill.mode === "expert") {
      const missing = missingExpertRequirements(drill.room);
      if (!clean) return "Expert 要求无失误";
      if (drill.target > 0 && elapsed > drill.target) return `用时 ${formatTime(elapsed)} / S ${formatTime(drill.target)}`;
      if (missing.length) return `缺高手动作：${missing.map(expertRequirementLabel).join("+")}`;
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
    updateDrillVariantButtons();
    if (practiceReport) {
      practiceReport.textContent = practiceReportText();
    }
    updatePracticeQueue();
    updatePracticeLedger();
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
      return `<button class="queue-card ${item.mode}" type="button" data-queue-room="${item.index}" data-queue-mode="${item.mode}">`
        + `<span>${escapeHtml(item.label)} · ${escapeHtml(drillContractStatus(item.stats))}</span>`
        + `<strong>${escapeHtml(title)}</strong>`
        + `<em>${escapeHtml(item.reason)} · ${escapeHtml(item.detail)}</em>`
        + `<i class="queue-meter" style="--queue-progress: ${progress}%" aria-hidden="true"></i>`
        + `<small>${escapeHtml(objective)}</small>`
        + `</button>`;
    }).join("");
    if (html === lastPracticeQueueHtml) return;
    lastPracticeQueueHtml = html;
    practiceQueue.innerHTML = html;
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
          + `<span class="ledger-stats"><strong>${escapeHtml(row.level)} ${row.score}</strong><em>${escapeHtml(stats)}${escapeHtml(focus)}</em><small>${escapeHtml(contract)}</small></span>`
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
    clearFocusPopup();
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
    const grab = keyHeldAny(actionCodes("grab")) || touch.grab || gamepadInput.grab;
    return {
      x: right ? 1 : left ? -1 : 0,
      y: down ? 1 : up ? -1 : 0,
      grab
    };
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
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find(Boolean);
    const nextHeld = new Set();

    for (const key of Object.keys(gamepadInput)) {
      gamepadInput[key] = false;
    }

    if (pad) {
      const ax = Math.abs(pad.axes[0] || 0) > 0.28 ? pad.axes[0] : 0;
      const ay = Math.abs(pad.axes[1] || 0) > 0.28 ? pad.axes[1] : 0;
      const pressedButton = (index, threshold = 0.5) => Boolean(pad.buttons[index]?.pressed || pad.buttons[index]?.value > threshold);
      gamepadInput.left = ax < -0.28 || pressedButton(14);
      gamepadInput.right = ax > 0.28 || pressedButton(15);
      gamepadInput.up = ay < -0.28 || pressedButton(12);
      gamepadInput.down = ay > 0.28 || pressedButton(13);
      gamepadInput.jump = pressedButton(0);
      gamepadInput.dash = pressedButton(1) || pressedButton(2) || pressedButton(7, 0.35);
      gamepadInput.grab = pressedButton(4) || pressedButton(5) || pressedButton(6, 0.35);
      gamepadInput.recall = pressedButton(3) || pressedButton(8);

      for (const action of ["jump", "dash", "grab", "recall"]) {
        if (gamepadInput[action]) nextHeld.add(action);
      }
    }

    for (const action of nextHeld) {
      if (!gamepadHeld.has(action)) {
        gamepadPressed.add(action);
        if (actionPulse[action] !== undefined) actionPulse[action] = ACTION_PULSE_TIME;
      }
    }
    gamepadHeld = nextHeld;
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

  function updateActionVisuals(dt) {
    for (const key of Object.keys(actionVisual)) {
      actionVisual[key] = Math.max(0, actionVisual[key] - dt);
    }
  }

  function resetActionVisuals() {
    for (const key of Object.keys(actionVisual)) {
      actionVisual[key] = 0;
    }
  }

  function visualRatio(name, duration) {
    return Math.max(0, Math.min(1, actionVisual[name] / duration));
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
      `R${index + 1} ${ROOM_NAMES[index] || "Summit"} / ${roomMedalLabel(index)} / ${roomPaceLabel(index)}`,
      `${roomCleanText(index)} / ${roomDrillText(index)} / ${roomSkillLabel(index)}`,
      roomDrillContractText(index),
      styleTrialText(index),
      roomPurposeLabel(index),
      roomRouteLine(index, 0),
      roomRouteLine(index, 1),
      roomRouteLine(index, 2)
    ].join("\n");
  }

  function updateRoomBrief() {
    if (!roomBrief || !roomSelect) return;
    const index = Number(roomSelect.value);
    const target = Number.isInteger(index) && index >= 0 && index < maps.length ? index : roomIndex;
    roomBrief.textContent = roomBriefText(target);
    updateDrillVariantButtons();
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
    settingsPanel.classList.toggle("hidden", !settingsVisible);
    settingsPanel.setAttribute("aria-hidden", String(!settingsVisible));
    if (settingsVisible) {
      settingsPanel.scrollTop = 0;
      syncSettingsPanel();
      settingsCloseButton?.focus({ preventScroll: true });
    } else {
      focusGame();
    }
  }

  function closeSettings() {
    settingsVisible = false;
    releaseAllInputs();
    settingsPanel.classList.add("hidden");
    settingsPanel.setAttribute("aria-hidden", "true");
    focusGame();
  }

  function syncSettingsPanel() {
    syncRoomSelect();
    if (shakeSlider) shakeSlider.value = String(settings.shake);
    if (debugToggle) debugToggle.checked = debugVisible;
    if (calmEffectsToggle) calmEffectsToggle.checked = settings.calmEffects;
    if (practiceLinesToggle) practiceLinesToggle.checked = settings.practiceLines;
    if (ghostOpacitySlider) ghostOpacitySlider.value = String(settings.ghostOpacity);
    if (controlPresetSelect) controlPresetSelect.value = settings.controlsPreset;
    updatePracticeCoach();
  }

  function readSettings() {
    const defaults = {
      shake: SHAKE_INTENSITY,
      calmEffects: true,
      controlsPreset: "comfort",
      practiceLines: true,
      ghostOpacity: 0.75
    };
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      const shake = Number(saved.shake);
      const ghostOpacity = Number(saved.ghostOpacity);
      return {
        shake: Number.isFinite(shake) ? Math.max(0, Math.min(1, shake)) : defaults.shake,
        calmEffects: saved.calmEffects === undefined ? defaults.calmEffects : Boolean(saved.calmEffects),
        controlsPreset: CONTROL_PRESETS[saved.controlsPreset] ? saved.controlsPreset : defaults.controlsPreset,
        practiceLines: saved.practiceLines === undefined ? defaults.practiceLines : Boolean(saved.practiceLines),
        ghostOpacity: Number.isFinite(ghostOpacity) ? Math.max(0.2, Math.min(1, ghostOpacity)) : defaults.ghostOpacity
      };
    } catch {
      return defaults;
    }
  }

  function writeSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Settings are convenience only; gameplay should continue without storage.
    }
  }

  function spawnLightTrail(dx, dy) {
    const count = settings.calmEffects ? 3 : 5;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2 + 7;
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1);
      lightTrails.push({
        x: cx - dx * LIGHT_TRAIL_STEP * i - LIGHT_TRAIL_WIDTH / 2,
        y: cy - dy * LIGHT_TRAIL_STEP * i + Math.sin(t * Math.PI) * 2,
        w: LIGHT_TRAIL_WIDTH - i * 4,
        h: LIGHT_TRAIL_HEIGHT,
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
      ctx.save();
      ctx.globalAlpha = Math.min(0.72, age * 0.7);
      ctx.shadowColor = "#76d7ff";
      ctx.shadowBlur = settings.calmEffects ? 6 : 12;
      ctx.fillStyle = "#76d7ff";
      roundRect(ctx, trail.x, trail.y - trail.h / 2, trail.w * pulse, trail.h, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.56)";
      ctx.fillRect(trail.x + 6, trail.y - 1, Math.max(6, trail.w - 12) * age, 2);
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
    focusPopupTimer = Math.max(0, focusPopupTimer - dt);
    crumbleSlipTimer = Math.max(0, crumbleSlipTimer - dt);
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

    if (dt > 0.012 && Math.random() < 0.5) {
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
    for (let i = 0; i < count; i++) {
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
    for (let i = 0; i < count; i++) {
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
    drawTiles(time);
    drawBestRoomPath(time);
    drawCurrentRoomPath(time);
    drawBestRoomGhost(time);
    drawRelayRoutes(time);
    drawLightTrails(time);
    drawEntities(time);
    drawDeathReplays();
    drawDeathMarks(time);
    drawParticles();
    drawGhosts();
    drawSparkCue(time);
    drawDashAimPreview(time);
    drawInputCues(time);
    drawFlowCue(time);
    drawRelayChainCue(time);
    drawRoomBestCue();
    drawPlayerAura(time);
    if (player.deadTimer <= 0) drawPlayer(time);
    ctx.restore();
    drawRoomIntro(time);
    drawSplitPopup(time);
    drawFocusPopup(time);
    drawDrillHud(time);
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
    ctx.font = "800 18px system-ui, sans-serif";
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
    ctx.font = "800 16px system-ui, sans-serif";
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

  function drawRoomIntro(time) {
    if (roomIntroTimer <= 0) return;
    const t = roomIntroTimer / ROOM_INTRO_TIME;
    const best = bestRoomTimes[roomIndex] || 0;
    const target = ROOM_TARGETS[roomIndex] || 0;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.4);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.62)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(248,251,255,0.92)";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.fillText(`${roomIndex + 1}. ${ROOM_NAMES[roomIndex] || "Summit"}`, W / 2, 82 - (1 - t) * 10);
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.fillStyle = "rgba(248,251,255,0.68)";
    ctx.fillText(`target ${formatTime(target)}${best ? ` / best ${formatTime(best)}` : ""}`, W / 2, 104 - (1 - t) * 10);
    ctx.fillStyle = "rgba(248,251,255,0.62)";
    ctx.fillText(`${roomMedalLabel(roomIndex)} / ${roomPaceLabel(roomIndex)} / ${roomCleanText(roomIndex)} / ${roomDrillText(roomIndex)}`, W / 2, 124 - (1 - t) * 10);
    ctx.fillText(fitText(roomPurposeLabel(roomIndex), 480), W / 2, 144 - (1 - t) * 10);
    const drill = activeDrillText(roomIndex);
    const focus = roomSelectFocusLabel(roomIndex).replace(" / ", "");
    if (drill) {
      ctx.fillStyle = "rgba(143,227,155,0.82)";
      ctx.fillText(fitText(drill, 520), W / 2, 164 - (1 - t) * 10);
    } else if (focus) {
      ctx.fillStyle = "rgba(247,198,93,0.78)";
      ctx.fillText(`focus ${focus}`, W / 2, 164 - (1 - t) * 10);
    } else {
      ctx.fillText(`${roomTierLabel(roomIndex)} / ${styleTrialLabel(roomIndex)} / ${roomSkillLabel(roomIndex)}`, W / 2, 164 - (1 - t) * 10);
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
    return `${weakestRoomSummary()} / ${splitLossSummary()} / 下个 Drill ${roomTrainingAdvice(next)}`;
  }

  function practiceReportText() {
    const cleanRooms = roomFocus.filter((entry) => entry && entry.clean > 0).length;
    const next = recommendedPracticeRoom();
    return `无失误 ${cleanRooms}/${maps.length} / ${drillSummary()} / ${contractSummary()} / ${practiceRouteSummary()} / 优先 ${practiceLedgerSummary()} / ${weakestRoomSummary()} / ${splitLossSummary()} / 建议 ${roomTrainingAdvice(next)}`;
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

  function reviewCardHtml(label, value, detail) {
    return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(detail)}</p></article>`;
  }

  function summitReviewCardsHtml() {
    const next = recommendedPracticeRoom();
    const nextMode = resolveDrillMode(next);
    const loss = largestSplitLossRoom();
    const focus = strongestFocusRoom();
    const splitValue = loss && loss.loss > 0 ? `R${loss.index + 1} ${formatDelta(loss.loss)}` : "全部达标";
    const splitDetail = loss && loss.loss > 0 ? routePracticeLine(loss.index) : "可以开始追高手线和 clean clear。";
    const focusValue = focus ? `R${focus.index + 1} ${deathReasonLabel(focus.reason)} ${focus.score}` : "暂无高压点";
    const focusDetail = focus ? roomCoachHint(focus.index, focus.reason) : "死亡结构稳定后，优先追最慢 split。";
    const lossButton = loss && loss.loss > 0
      ? `<button class="review-button" type="button" data-finish-drill="${loss.index}" data-finish-mode="pace">最慢房 Pace</button>`
      : "";
    return `<div class="review-grid">`
      + reviewCardHtml("下一 Drill", `R${next + 1} ${drillModeLabel(nextMode)}`, drillObjectiveForRoom(next, nextMode))
      + reviewCardHtml("最大损失", splitValue, splitDetail)
      + reviewCardHtml("薄弱原因", focusValue, focusDetail)
      + reviewCardHtml("训练航线", practiceRouteSummary(), "先稳 clean，再追 target，最后冲高手线。")
      + `</div><p class="review-advice">${escapeHtml(roomTrainingAdvice(next))}</p>`
      + `<div class="review-actions"><button class="review-button primary-review" type="button" data-finish-drill="${next}" data-finish-mode="${nextMode}">下一 ${drillModeLabel(nextMode)}</button>${lossButton}</div>`;
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
    ctx.font = "800 15px system-ui, sans-serif";
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
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.shadowColor = palette.hot;
    ctx.shadowBlur = settings.calmEffects ? 5 : 11;
    ctx.fillStyle = "#ff99aa";
    ctx.fillText(focusPopupText, W / 2, y + Math.sin(time * 16) * 1.2);
    if (focusPopupDetail) {
      ctx.font = "800 10px system-ui, sans-serif";
      ctx.fillStyle = "rgba(248,251,255,0.72)";
      ctx.shadowBlur = settings.calmEffects ? 3 : 7;
      ctx.fillText(focusPopupDetail, W / 2, y + 18);
    }
    ctx.restore();
  }

  function drawDrillHud(time) {
    if (!activeDrill || activeDrill.room !== roomIndex || won) return;
    const current = roomMistakes[roomIndex] || 0;
    const text = `${drillModeLabel(activeDrill.mode).toUpperCase()} R${roomIndex + 1} · ${activeDrill.objective}${current ? ` · !${current}` : " · 无失误"}`;
    const y = roomIntroTimer > 0 ? 188 : 84;
    const pulse = 0.5 + Math.sin(time * 8) * 0.5;
    ctx.save();
    ctx.font = "800 15px system-ui, sans-serif";
    const label = fitText(text, 520);
    const width = Math.min(590, Math.max(260, ctx.measureText(label).width + 32));
    const x = W / 2 - width / 2;
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = "rgba(7,12,20,0.72)";
    roundRect(ctx, x, y - 18, width, 36, 6);
    ctx.fill();
    ctx.strokeStyle = `rgba(143,227,155,${0.32 + pulse * 0.18})`;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x + 0.5, y - 17.5, width - 1, 35, 6);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = palette.green;
    ctx.shadowBlur = settings.calmEffects ? 4 : 9;
    ctx.fillStyle = current ? "#fff0a0" : palette.green;
    ctx.fillText(label, W / 2, y);
    ctx.restore();
  }

  function drawFlowCue(time) {
    if (player.deadTimer > 0 || flowPopupTimer <= 0 || flowScore <= 0) return;
    const t = flowPopupTimer / FLOW_POPUP_TIME;
    const cx = player.x + player.w / 2;
    const cy = player.y - 48 - (1 - t) * 12;
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.25);
    ctx.font = "800 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = flowScore >= 160 ? palette.gold : palette.cyan;
    ctx.shadowBlur = 9;
    ctx.fillStyle = flowScore >= 160 ? palette.gold : "#f8fbff";
    ctx.fillText(`${flowLabel.toUpperCase()} ${Math.floor(flowScore)}`, cx, cy);
    ctx.strokeStyle = flowScore >= 160 ? palette.gold : palette.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, player.y + player.h / 2, 28 + Math.sin(time * 20) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, palette.skyTop);
    gradient.addColorStop(0.55, palette.skyMid);
    gradient.addColorStop(1, palette.skyLow);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 42; i++) {
      const x = (i * 137 + roomIndex * 53) % W;
      const y = (i * 79 + 40) % 210;
      ctx.fillStyle = i % 6 === 0 ? "#ffeab0" : "#ecf9ff";
      ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
    ctx.restore();

    drawMountainLayer("#1e2d3f", 0.35, 80 + roomIndex * 18, 0.18);
    drawMountainLayer("#263d4c", 0.48, 150 + roomIndex * 9, 0.12);
    drawMountainLayer("#45616a", 0.72, 220, 0.08);

    ctx.fillStyle = "rgba(255, 231, 180, 0.55)";
    ctx.beginPath();
    ctx.arc(W - 110, 84 + Math.sin(time * 0.3) * 4, 42, 0, Math.PI * 2);
    ctx.fill();
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
      ctx.font = "800 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.shadowColor = "rgba(0,0,0,0.72)";
      ctx.shadowBlur = 8;
      ctx.fillText(deathReasonLabel(mark.reason), 0, -22);
      ctx.restore();
      ctx.strokeStyle = "rgba(248,251,255,0.72)";
      ctx.beginPath();
      ctx.arc(0, 0, 12 + (1 - t) * 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
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
      `relay chain ${relayChain}  best ${bestRelayChain}`,
      `flow ${Math.floor(flowScore)} peak ${Math.floor(flowPeak)} best ${Math.floor(bestFlow)}  deaths ${deathCount}`,
      `last death ${lastDeathReason === "none" ? "none" : deathReasonLabel(lastDeathReason)}  reasons ${deathReasonSummary()}`,
      `room focus ${roomFocusDetails(roomIndex)}`,
      `coach ${practiceCoachText()}`,
      `stamina ${(player.stamina * 100).toFixed(0)}  anchor ${echoAnchor && echoAnchor.room === roomIndex ? 1 : 0}`,
      `hitstop ${hitStopTimer.toFixed(3)}  ghosts ${ghosts.length}`,
      `trails ${lightTrails.length}  relays ${room.entities.relays.length}  prisms ${room.entities.prisms.length}  up ${room.entities.updrafts.length}  crumble ${crumble.active}/${crumble.total}`,
      `paths room ${roomPath.length}  best ${Array.isArray(bestRoomPaths[roomIndex]) ? bestRoomPaths[roomIndex].length : 0}  lines ${settings.practiceLines ? 1 : 0}  ghost ${settings.ghostOpacity.toFixed(2)}`,
      `shake ${settings.shake.toFixed(2)}  keys ${settings.controlsPreset}`
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
