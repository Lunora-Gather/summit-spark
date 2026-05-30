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
  const controlPresetSelect = document.getElementById("controlPreset");
  const roomSelect = document.getElementById("roomSelect");
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
  const PATH_SAMPLE_INTERVAL = 0.045;
  const RECENT_PATH_SECONDS = 1.55;
  const DEATH_REPLAY_LIFE = 5.2;
  const MAX_ROOM_PATH_POINTS = 260;
  const ROOM_BEST_FLASH_TIME = 1.15;
  const SPLIT_POPUP_TIME = 1.25;
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
      "..............................",
      "....................A.........",
      "...............####...........",
      "..P...........................",
      "#####.........................",
      "........A.............R.......",
      "......####..........#####.....",
      "..............................",
      "............^^^^^.............",
      "............#####.............",
      "....####..................A...",
      "......................####....",
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
      "..................U...........",
      "..............#####...........",
      "..........................R...",
      ".........U............####....",
      ".....CCCCC....................",
      "..............................",
      "..M...........U..........A....",
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
      "..P.......B........A..........",
      "#####...CCCCC....CC###........",
      "..............................",
      "............^^^^..............",
      "............####.......B......",
      "....U..................CCCC...",
      "..............................",
      "##########################...."
    ],
    [
      "..............................",
      ".........................L....",
      ".....................#####....",
      "..............................",
      "......M...........B...........",
      ".....CCCC......CCCC...........",
      "..........................R...",
      "..P.......A.............####..",
      "#####.........................",
      ".............U................",
      ".........CCCC###..............",
      "........................A.....",
      ".....B........^^^^.....####...",
      "....CCCC......CCCC............",
      "....................U.........",
      ".........................####.",
      "#######################......."
    ],
    [
      "..............................",
      "..............................",
      "....................L.........",
      ".................#####........",
      "..............................",
      "......A......B...........R....",
      ".....CCCC..CCCCC......CCCC....",
      "..............................",
      "..P.........U.................",
      "#####....CCC##.........A......",
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
  const settings = readSettings();
  const actionPulse = {
    jump: 0,
    dash: 0,
    grab: 0,
    fall: 0,
    wall: 0
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
    if (event.code === "Escape" && settingsVisible && firstPress) {
      closeSettings();
      return;
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
    keys.delete(event.code);
    if (isActionCode(event.code, "jump")) cutJump();
  });

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
    runTime = 0;
    roomTime = 0;
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
    resetActionPulses();
    overlay.classList.add("hidden");
    resetToStart(0);
    updateHud();
  }

  function jumpToRoom(index) {
    collected = new Set();
    deathCount = 0;
    runTime = 0;
    roomTime = 0;
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
    resetActionPulses();
    overlay.classList.add("hidden");
    started = true;
    resetToStart(index);
    seedHair();
    updateHud();
    focusGame();
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    fps = fps * 0.9 + (dt > 0 ? (1 / dt) * 0.1 : 0);
    updateGlobalEffects(dt);
    if (!started || won) {
      updateGamepad();
      if (!started && (gamepadPressed.has("jump") || gamepadPressed.has("dash"))) {
        begin();
      }
    }

    if (started && !won) {
      update(dt);
    } else {
      updateParticles(dt);
      updateGhosts(dt);
      updateDeathMarks(dt);
      updateRelayChain(dt);
    }

    render(now / 1000);
    pressed.clear();
    touchPressed.clear();
    gamepadPressed.clear();
    requestAnimationFrame(frame);
  }

  function update(dt) {
    runTime += dt;
    roomTime += dt;
    updateDeathMarks(dt);
    updateRelayChain(dt);

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
      shake(0.055, Math.min(2.4, fallSpeed / 320));
      burst(player.x + player.w / 2, player.y + player.h, "#e9f7ff", 4, 90);
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
    addFlow(12, "spark");
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
        player.overdrive = OVERDRIVE_TIME;
        player.dashes = 1;
        player.dashCooldown = 0;
        player.stamina = MAX_STAMINA;
        player.vx += dx * 180;
        player.vy = Math.min(player.vy + dy * 150, -160);
        addFlow(34, "prism");
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
        anchor.pulse = 0.3;
        recallPulseTimer = Math.max(recallPulseTimer, 0.35);
        if (changed) {
          addFlow(10, "echo");
          burst(anchor.x, anchor.y, palette.green, 14, 220);
        }
      }
    }

    for (const spring of room.entities.springs) {
      spring.pulse = Math.max(0, spring.pulse - dt);
      if (aabb(box, spring) && player.vy >= 0) {
        player.y = spring.y - player.h;
        player.vy = -720;
        player.dashes = 1;
        player.stamina = MAX_STAMINA;
        spring.pulse = 0.22;
        burst(spring.x + spring.w / 2, spring.y + 6, palette.green, 16, 260);
      }
    }

    if (room.entities.goal && distRectPoint(box, room.entities.goal.x, room.entities.goal.y) < 28) {
      won = true;
      const isBest = completeRun();
      overlay.innerHTML = `<h1>\u767b\u9876</h1><p>${formatTime(runTime)}${isBest ? "  BEST" : ""} \u00b7 D ${deathCount} \u00b7 Relay ${bestRelayChain} \u00b7 Flow ${Math.floor(flowPeak)}</p><p>${masterySummary()}</p><button class="primary" id="restartButton" type="button">\u518d\u6765</button>`;
      overlay.classList.remove("hidden");
      document.getElementById("restartButton").addEventListener("click", hardReset);
      burst(room.entities.goal.x, room.entities.goal.y, palette.gold, 64, 420);
    }

    const hazard = touchingHazard(box);
    if (!hazard && nearMissCooldown <= 0 && Math.hypot(player.vx, player.vy) > 320 && nearHazard(box, 10)) {
      nearMissCooldown = NEAR_MISS_COOLDOWN;
      addFlow(16, "edge");
      burst(player.x + player.w / 2, player.y + player.h / 2, palette.hot, 5, 150);
    }

    if (hazard || player.y > H + 80) {
      die();
    }
  }

  function completeRun() {
    recordRoomBest(roomIndex);
    addFlow(120, "summit");
    if (bestTime <= 0 || runTime < bestTime) {
      bestTime = runTime;
      writeBestTime(bestTime);
      return true;
    }
    return false;
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
      over: Boolean(point.over)
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
      recordRoomBest(roomIndex);
      roomIndex += 1;
      room = parseRoom(roomIndex);
      lightTrails.length = 0;
      player.x = -player.w + 4;
      roomTime = 0;
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
      lightTrails.length = 0;
      player.x = W - 5;
      roomTime = 0;
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

  function die() {
    if (player.deadTimer > 0 || won) return;
    deathCount += 1;
    addDeathMark();
    resetRelayChain();
    breakFlow();
    clearSplitPopup();
    player.deadTimer = DEATH_RETRY_TIME;
    hitStopTimer = Math.max(hitStopTimer, DEATH_HITSTOP);
    shake(0.2, 6.4);
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.hot, 34, 360);
    player.vx = 0;
    player.vy = 0;
  }

  function respawn() {
    roomIndex = player.respawnRoom;
    room = parseRoom(roomIndex);
    player.x = player.respawnX;
    player.y = player.respawnY;
    player.vx = 0;
    player.vy = 0;
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
    player.wallCoyote = 0;
    player.wallCoyoteDir = 0;
    player.overdrive = 0;
    player.ghostTimer = 0;
    player.deadTimer = 0;
    clearSplitPopup();
    roomTime = 0;
    ghosts.length = 0;
    lightTrails.length = 0;
    shards.length = 0;
    clearRecentPath();
    clearRoomPath();
    resetRelayChain();
    seedHair();
    burst(player.x + player.w / 2, player.y + player.h / 2, "#f8fbff", 16, 230);
  }

  function quickRetry() {
    if (player.deadTimer > 0) return;
    deathCount += 1;
    addDeathMark();
    resetRelayChain();
    breakFlow();
    hitStopTimer = 0;
    shake(0.08, 3.4);
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.hot, 18, 240);
    respawn();
  }

  function restartCurrentRoom() {
    if (player.deadTimer > 0) return;
    deathCount += 1;
    addDeathMark();
    resetRelayChain();
    breakFlow();
    room = parseRoom(roomIndex);
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
    roomTime = 0;
    hitStopTimer = 0;
    ghosts.length = 0;
    lightTrails.length = 0;
    shards.length = 0;
    clearRecentPath();
    clearRoomPath();
    seedHair();
    burst(player.x + player.w / 2, player.y + player.h / 2, "#f8fbff", 12, 210);
  }

  function addDeathMark() {
    const points = recentPath
      .filter((point) => point.room === roomIndex)
      .map((point) => ({ ...point }));
    if (points.length > 2) {
      deathReplays.push({
        room: roomIndex,
        points,
        life: DEATH_REPLAY_LIFE,
        max: DEATH_REPLAY_LIFE
      });
      while (deathReplays.length > 4) deathReplays.shift();
    }
    deathMarks.push({
      room: roomIndex,
      x: player.x + player.w / 2,
      y: player.y + player.h / 2,
      life: DEATH_MARK_LIFE,
      max: DEATH_MARK_LIFE
    });
    while (deathMarks.length > 12) deathMarks.shift();
    clearRecentPath();
  }

  function getInput() {
    const left = keys.has("ArrowLeft") || keys.has("KeyA") || touch.left || gamepadInput.left;
    const right = keys.has("ArrowRight") || keys.has("KeyD") || touch.right || gamepadInput.right;
    const up = keys.has("ArrowUp") || keys.has("KeyW") || gamepadInput.up;
    const down = keys.has("ArrowDown") || keys.has("KeyS") || gamepadInput.down;
    const grab = keyHeldAny(actionCodes("grab")) || touch.grab || gamepadInput.grab;
    return {
      x: right ? 1 : left ? -1 : 0,
      y: down ? 1 : up ? -1 : 0,
      grab
    };
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

  function populateRoomSelect() {
    if (!roomSelect) return;
    roomSelect.innerHTML = "";
    maps.forEach((_, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${index + 1}. ${ROOM_NAMES[index] || "Summit"}`;
      roomSelect.appendChild(option);
    });
  }

  function syncRoomSelect() {
    if (!roomSelect || document.activeElement === roomSelect) return;
    roomSelect.value = String(roomIndex);
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
    settingsPanel.classList.toggle("hidden", !settingsVisible);
    settingsPanel.setAttribute("aria-hidden", String(!settingsVisible));
    if (settingsVisible) settingsCloseButton?.focus({ preventScroll: true });
    else focusGame();
  }

  function closeSettings() {
    settingsVisible = false;
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
    if (controlPresetSelect) controlPresetSelect.value = settings.controlsPreset;
  }

  function readSettings() {
    const defaults = {
      shake: SHAKE_INTENSITY,
      calmEffects: true,
      controlsPreset: "comfort",
      practiceLines: true
    };
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      const shake = Number(saved.shake);
      return {
        shake: Number.isFinite(shake) ? Math.max(0, Math.min(1, shake)) : defaults.shake,
        calmEffects: saved.calmEffects === undefined ? defaults.calmEffects : Boolean(saved.calmEffects),
        controlsPreset: CONTROL_PRESETS[saved.controlsPreset] ? saved.controlsPreset : defaults.controlsPreset,
        practiceLines: saved.practiceLines === undefined ? defaults.practiceLines : Boolean(saved.practiceLines)
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
    roomBestFlashTimer = Math.max(0, roomBestFlashTimer - dt);
    nearMissCooldown = Math.max(0, nearMissCooldown - dt);
    recallCooldown = Math.max(0, recallCooldown - dt);
    recallPulseTimer = Math.max(0, recallPulseTimer - dt);
    roomIntroTimer = Math.max(0, roomIntroTimer - dt);
    splitPopupTimer = Math.max(0, splitPopupTimer - dt);
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
        shake(0.035, 1.2);
        burst(block.x * TILE + TILE / 2, block.y * TILE + 6, "#e7f4f7", 5, 95);
      }
    }

    for (const block of room.entities.crumble.values()) {
      if (room.tiles[block.y]?.[block.x] !== "C" || block.timer <= 0) continue;
      block.timer = Math.max(0, block.timer - dt);
      if (block.timer <= 0) {
        room.tiles[block.y][block.x] = ".";
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

    if (Math.random() < 0.5) {
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
      over: player.overdrive > 0
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
    if (player.deadTimer <= 0) drawPlayer(time);
    ctx.restore();
    drawRoomIntro(time);
    drawSplitPopup(time);
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
    ctx.save();
    ctx.globalAlpha = 0.22;
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
    ctx.globalAlpha = 0.28 + Math.sin(time * 8) * 0.05;
    const last = points[points.length - 1];
    ctx.fillStyle = palette.cyan;
    ctx.fillRect(last.x - 3, last.y - 3, 6, 6);
    ctx.restore();
  }

  function drawBestRoomGhost(time) {
    if (!settings.practiceLines || player.deadTimer > 0) return;
    const path = bestRoomPaths[roomIndex];
    if (!Array.isArray(path) || path.length < 2) return;
    const rawIndex = Math.min(path.length - 1, Math.max(0, roomTime / PATH_SAMPLE_INTERVAL));
    const ghost = pointOnPath(path, rawIndex);
    if (!ghost) return;
    const pulse = 1 + Math.sin(time * 9) * 0.06;
    ctx.save();
    ctx.globalAlpha = 0.46;
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
    ctx.restore();
  }

  function masterySummary() {
    const counts = { S: 0, A: 0, B: 0, C: 0 };
    bestRoomTimes.forEach((best, index) => {
      const grade = splitGrade(best, ROOM_TARGETS[index]);
      if (counts[grade] !== undefined) counts[grade] += 1;
    });
    return `S ${counts.S}/${maps.length} / A ${counts.A} / Flow Best ${Math.floor(bestFlow)}`;
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
    ctx.strokeStyle = armed > 0 ? "rgba(255,101,125,0.62)" : "rgba(248,251,255,0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 7);
    ctx.lineTo(x + 14 + armed * 5, y + 17);
    ctx.lineTo(x + 10, y + 28);
    ctx.moveTo(x + 22, y + 6);
    ctx.lineTo(x + 16 - armed * 4, y + 18);
    ctx.lineTo(x + 25, y + 28);
    ctx.stroke();
    if (armed > 0) {
      ctx.fillStyle = `rgba(255,101,125,${0.18 + (1 - armed) * 0.28})`;
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
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
    const path = bestRoomPaths[roomIndex];
    if (!Array.isArray(path) || path.length < 2) return;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = "rgba(247, 198, 93, 0.38)";
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
      ctx.globalAlpha = point.dash || point.spark || point.over ? 0.72 : 0.42;
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
  }

  function drawDeathMarks(time) {
    for (const mark of deathMarks) {
      if (mark.room !== roomIndex) continue;
      const t = Math.max(0, mark.life / mark.max);
      ctx.save();
      ctx.globalAlpha = t * 0.62;
      ctx.translate(mark.x, mark.y);
      ctx.rotate(time * 1.8);
      ctx.strokeStyle = palette.hot;
      ctx.lineWidth = 2;
      ctx.shadowColor = palette.hot;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-7, -7);
      ctx.lineTo(7, 7);
      ctx.moveTo(7, -7);
      ctx.lineTo(-7, 7);
      ctx.stroke();
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
      ctx.strokeStyle = `rgba(255, 92, 108, ${0.2 + fade * 0.38})`;
      ctx.shadowColor = palette.hot;
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
    const step = Math.sin(time * 15) * Math.min(1, Math.abs(player.vx) / MOVE_SPEED);
    const over = player.overdrive > 0;
    const coat = over ? "#f7c65d" : player.dashes > 0 ? "#2fc7d6" : "#6f8fa8";
    const coatDark = over ? "#9f6a1b" : player.dashes > 0 ? "#146d86" : "#304d63";
    const hairColor = over ? "#8fe39b" : player.dashes > 0 ? "#ff657d" : "#78cfff";

    ctx.save();

    if (over) {
      ctx.globalAlpha = 0.22 + Math.sin(time * 18) * 0.06;
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 2;
      ctx.shadowColor = palette.gold;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, y + player.h / 2, 19, 0, Math.PI * 2);
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
      ctx.strokeStyle = `rgba(255, 190, 87, ${0.24 + fade * 0.38})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y + 1);
      ctx.lineTo(b.x, b.y + 1);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, y + player.h + 4, 14, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, y + player.h / 2);
    ctx.rotate(Math.max(-0.16, Math.min(0.16, player.vx / 1400)));
    ctx.translate(-cx, -(y + player.h / 2));

    ctx.fillStyle = "#25364a";
    roundRect(ctx, x + 5 - player.facing, y + 10, 7, 12, 2);
    ctx.fill();

    ctx.fillStyle = coatDark;
    roundRect(ctx, x + 5, y + 8, 10, 15, 3);
    ctx.fill();
    ctx.fillStyle = coat;
    roundRect(ctx, x + 4, y + 7, 11, 14, 3);
    ctx.fill();
    ctx.fillStyle = "#e9f7ff";
    ctx.fillRect(x + 6, y + 9, 7, 2);
    ctx.fillStyle = "rgba(255,255,255,0.24)";
    ctx.fillRect(x + 6, y + 12, 2, 7);

    ctx.strokeStyle = "#ffc857";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - player.facing * 1, y + 11);
    ctx.lineTo(cx - player.facing * 7, y + 14 + step * 1.2);
    ctx.stroke();
    ctx.strokeStyle = "#d8ecff";
    ctx.beginPath();
    ctx.moveTo(cx + player.facing * 3, y + 11);
    ctx.lineTo(cx + player.facing * 7, y + 15 - step);
    ctx.stroke();

    ctx.strokeStyle = "#172233";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 21);
    ctx.lineTo(x + 5 + step * 2, y + 28);
    ctx.moveTo(x + 13, y + 21);
    ctx.lineTo(x + 15 - step * 2, y + 28);
    ctx.stroke();
    ctx.fillStyle = "#0f1927";
    ctx.fillRect(x + 2 + step * 2, y + 27, 7, 3);
    ctx.fillRect(x + 12 - step * 2, y + 27, 7, 3);

    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 4);
    ctx.lineTo(x + 15, y + 3);
    ctx.lineTo(x + 17, y + 10);
    ctx.lineTo(x + 10, y + 13);
    ctx.lineTo(x + 4, y + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffe0bd";
    roundRect(ctx, x + 7 + player.facing, y + 5, 8, 8, 2);
    ctx.fill();
    ctx.fillStyle = "#1b2533";
    ctx.fillRect(x + 11 + player.facing * 2, y + 8, 2, 2);

    ctx.fillStyle = "#fff0a0";
    ctx.fillRect(cx - player.facing * 2, y + 12, 4, 3);
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.fillRect(x + 8, y + 7, 3, 1);

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
      `stamina ${(player.stamina * 100).toFixed(0)}  anchor ${echoAnchor && echoAnchor.room === roomIndex ? 1 : 0}`,
      `hitstop ${hitStopTimer.toFixed(3)}  ghosts ${ghosts.length}`,
      `trails ${lightTrails.length}  relays ${room.entities.relays.length}  prisms ${room.entities.prisms.length}  up ${room.entities.updrafts.length}  crumble ${crumble.active}/${crumble.total}`,
      `paths room ${roomPath.length}  best ${Array.isArray(bestRoomPaths[roomIndex]) ? bestRoomPaths[roomIndex].length : 0}  lines ${settings.practiceLines ? 1 : 0}`,
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




