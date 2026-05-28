(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const startButton = document.getElementById("startButton");
  const overlay = document.getElementById("overlay");
  const lumenCount = document.getElementById("lumenCount");
  const debugPanel = document.getElementById("debugPanel");
  const settingsButton = document.getElementById("settingsButton");
  const settingsPanel = document.getElementById("settingsPanel");
  const settingsCloseButton = document.getElementById("settingsClose");
  const shakeSlider = document.getElementById("shakeSlider");
  const debugToggle = document.getElementById("debugToggle");
  const calmEffectsToggle = document.getElementById("calmEffectsToggle");
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
  const JUMP_CUT_MULTIPLIER = 0.52;
  const DEATH_RETRY_TIME = 0.26;
  const DASH_HITSTOP = 0.018;
  const DEATH_HITSTOP = 0.035;
  const SHAKE_INTENSITY = 0;
  const LIGHT_TRAIL_LIFE = 0.62;
  const LIGHT_TRAIL_WIDTH = 42;
  const LIGHT_TRAIL_HEIGHT = 4;
  const LIGHT_TRAIL_STEP = 16;

  const SOLID = new Set(["#"]);
  const HAZARDS = new Set(["^", "v", "<", ">"]);
  const JUMP_CODES = new Set(["Space", "KeyC", "KeyJ"]);
  const DASH_CODES = new Set(["KeyX", "KeyK", "ShiftLeft", "ShiftRight", "KeyE"]);
  const GRAB_CODES = new Set(["KeyZ", "KeyL", "ControlLeft", "ControlRight", "KeyV"]);
  const START_CODES = new Set(["Enter", ...JUMP_CODES, ...DASH_CODES]);
  const BLOCKED_CODES = new Set([
    ...JUMP_CODES,
    ...DASH_CODES,
    ...GRAB_CODES,
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Enter",
    "KeyR",
    "KeyO",
    "F3"
  ]);

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
      "..........................R...",
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
      "..........................H...",
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
  let roomIndex = 0;
  let room = null;
  let started = false;
  let won = false;
  let lastTime = performance.now();
  let deathCount = 0;
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
  const settings = { shake: SHAKE_INTENSITY, calmEffects: true };
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
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
    if (JUMP_CODES.has(event.code)) cutJump();
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
  });
  debugToggle?.addEventListener("change", () => setDebugVisible(debugToggle.checked));
  calmEffectsToggle?.addEventListener("change", () => {
    settings.calmEffects = calmEffectsToggle.checked;
  });
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
    const spawn = room.entities.start;
    Object.assign(player, {
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      wasGrounded: false,
      wallDir: 0,
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
    won = false;
    hitStopTimer = 0;
    shakeTimer = 0;
    shakeDuration = 0;
    shakePower = 0;
    ghosts.length = 0;
    lightTrails.length = 0;
    overlay.classList.add("hidden");
    resetToStart(0);
    updateHud();
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    fps = fps * 0.9 + (dt > 0 ? (1 / dt) * 0.1 : 0);
    updateGlobalEffects(dt);

    if (started && !won) {
      update(dt);
    } else {
      updateParticles(dt);
      updateGhosts(dt);
    }

    render(now / 1000);
    pressed.clear();
    touchPressed.clear();
    requestAnimationFrame(frame);
  }

  function update(dt) {
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
    player.coyote = player.wasGrounded ? COYOTE_TIME : Math.max(0, player.coyote - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.sparkHopTimer = Math.max(0, player.sparkHopTimer - dt);
    player.wallJumpLock = Math.max(0, player.wallJumpLock - dt);

    if (player.onGround || player.wasGrounded) {
      player.stamina = MAX_STAMINA;
      player.dashes = 1;
      player.sparkHopTimer = 0;
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
      player.vy = Math.min(MAX_FALL, player.vy + currentGravity() * dt);
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
    updateEntities(dt);
    updateHair(dt);
    updateParticles(dt);
    updateGhosts(dt);
    updateLightTrails(dt);
    updateHud();
  }

  function updateBuffers(dt) {
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    player.dashBuffer = Math.max(0, player.dashBuffer - dt);

    if (justPressedAny(JUMP_CODES) || touchPressed.has("jump")) {
      player.jumpBuffer = JUMP_BUFFER_TIME;
    }
    if (justPressedAny(DASH_CODES) || touchPressed.has("dash")) {
      player.dashBuffer = DASH_BUFFER_TIME;
    }
  }

  function runGroundAir(input, dt) {
    const preservingLaunch = player.wallJumpLock > 0 && !player.wasGrounded && Math.abs(player.vx) > MOVE_SPEED;
    if (!preservingLaunch) {
      const lockedAgainstPush = player.wallJumpLock > 0 && input.x !== 0 && Math.sign(player.vx) !== input.x;
      const moveX = lockedAgainstPush ? 0 : input.x;
      const target = moveX * MOVE_SPEED;
      const turning = moveX !== 0 && Math.abs(player.vx) > 24 && Math.sign(player.vx) !== Math.sign(target);
      const accel = turning ? TURN_ACCEL : player.wasGrounded ? ACCEL : AIR_ACCEL;
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
      shake(0.035, 1.1);
      burst(player.x + player.w / 2, player.y + player.h, "#e9f7ff", 8, 150);
      return;
    }

    if (player.sparkHopTimer > 0 && player.dashTimer <= 0) {
      sparkHop();
      return;
    }

    if (player.wallDir !== 0) {
      const away = input.x === -player.wallDir;
      const climbJump = input.grab && player.stamina > 0;
      const push = climbJump ? WALL_CLIMB_X : away ? WALL_JUMP_X : WALL_NEUTRAL_X;
      const lift = climbJump ? JUMP * (input.y > 0 ? 0.9 : 1.02) : away ? JUMP * 0.96 : JUMP * 0.91;
      player.vx = -player.wallDir * push;
      player.vy = -lift;
      player.jumpBuffer = 0;
      player.facing = -player.wallDir;
      player.wallJumpLock = WALL_JUMP_LOCK_TIME;
      if (climbJump) player.stamina = Math.max(0, player.stamina - 0.18);
      shake(0.04, 1.35);
      burst(player.x + (player.wallDir > 0 ? player.w : 0), player.y + player.h * 0.55, climbJump ? palette.green : "#e9f7ff", 9, 190);
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
    player.vx = dx * DASH_SPEED;
    player.vy = dy * DASH_SPEED;
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

  function updateEntities(dt) {
    const box = getPlayerBox();

    for (const lumen of room.entities.lumens) {
      if (!lumen.taken && distRectPoint(box, lumen.x, lumen.y) < 22) {
        lumen.taken = true;
        collected.add(lumen.id);
        burst(lumen.x, lumen.y, palette.gold, 22, 250);
      }
      lumen.bob += dt * 4;
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
        burst(refill.x, refill.y, palette.cyan, 26, 310);
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
      overlay.innerHTML = `<h1>登顶</h1><button class="primary" id="restartButton" type="button">再来</button>`;
      overlay.classList.remove("hidden");
      document.getElementById("restartButton").addEventListener("click", hardReset);
      burst(room.entities.goal.x, room.entities.goal.y, palette.gold, 64, 420);
    }

    if (touchingHazard(box) || player.y > H + 80) {
      die();
    }
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
      roomIndex += 1;
      room = parseRoom(roomIndex);
      lightTrails.length = 0;
      player.x = -player.w + 4;
      player.respawnRoom = roomIndex;
      player.respawnX = 26;
      player.respawnY = Math.min(player.y, H - TILE * 3);
      burst(28, player.y + player.h / 2, palette.cyan, 10, 170);
    }
    if (player.x < -player.w - 3 && roomIndex > 0) {
      roomIndex -= 1;
      room = parseRoom(roomIndex);
      lightTrails.length = 0;
      player.x = W - 5;
      player.respawnRoom = roomIndex;
      player.respawnX = player.x;
      player.respawnY = Math.min(player.y, H - TILE * 3);
      burst(W - 28, player.y + player.h / 2, palette.cyan, 10, 170);
    }
  }

  function die() {
    if (player.deadTimer > 0 || won) return;
    deathCount += 1;
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
    player.ghostTimer = 0;
    player.deadTimer = 0;
    ghosts.length = 0;
    lightTrails.length = 0;
    shards.length = 0;
    seedHair();
    burst(player.x + player.w / 2, player.y + player.h / 2, "#f8fbff", 16, 230);
  }

  function quickRetry() {
    if (player.deadTimer > 0) return;
    deathCount += 1;
    hitStopTimer = 0;
    shake(0.08, 3.4);
    burst(player.x + player.w / 2, player.y + player.h / 2, palette.hot, 18, 240);
    respawn();
  }

  function getInput() {
    const left = keys.has("ArrowLeft") || keys.has("KeyA") || touch.left;
    const right = keys.has("ArrowRight") || keys.has("KeyD") || touch.right;
    const up = keys.has("ArrowUp") || keys.has("KeyW");
    const down = keys.has("ArrowDown") || keys.has("KeyS");
    const grab = keyHeldAny(GRAB_CODES) || touch.grab;
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
    if (JUMP_CODES.has(code)) player.jumpBuffer = JUMP_BUFFER_TIME;
    if (DASH_CODES.has(code)) player.dashBuffer = DASH_BUFFER_TIME;
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
    if (shakeSlider) shakeSlider.value = String(settings.shake);
    if (debugToggle) debugToggle.checked = debugVisible;
    if (calmEffectsToggle) calmEffectsToggle.checked = settings.calmEffects;
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
    return keyHeldAny(JUMP_CODES) || touch.jump;
  }

  function currentGravity() {
    if (player.vy < -40 && jumpHeld()) return GRAVITY * 0.82;
    if (player.vy > 60) return GRAVITY * 1.08;
    return GRAVITY;
  }

  function toggleDebug() {
    setDebugVisible(!debugVisible);
  }

  function updateGlobalEffects(dt) {
    if (shakeTimer > 0) {
      shakeTimer = Math.max(0, shakeTimer - dt);
      if (shakeTimer === 0) {
        shakePower = 0;
        shakeDuration = 0;
      }
    }
  }

  function shake(duration, power) {
    if (SHAKE_INTENSITY <= 0) return;
    shakeTimer = Math.max(shakeTimer, duration);
    shakeDuration = Math.max(shakeDuration, duration);
    shakePower = Math.max(shakePower, power * SHAKE_INTENSITY);
  }

  function shakeOffset() {
    if (shakeTimer <= 0 || shakeDuration <= 0) return { x: 0, y: 0 };
    const strength = shakePower * (shakeTimer / shakeDuration);
    return {
      x: (Math.random() * 2 - 1) * strength,
      y: (Math.random() * 2 - 1) * strength
    };
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
    drawLightTrails(time);
    drawEntities(time);
    drawParticles();
    drawGhosts();
    drawSparkCue(time);
    if (player.deadTimer <= 0) drawPlayer(time);
    ctx.restore();
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

  function drawEntities(time) {
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
    const coat = player.dashes > 0 ? "#2fc7d6" : "#6f8fa8";
    const coatDark = player.dashes > 0 ? "#146d86" : "#304d63";
    const hairColor = player.dashes > 0 ? "#ff657d" : "#78cfff";

    ctx.save();

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

  function updateHud() {
    const found = collected.size;
    lumenCount.textContent = `${found}/${totalLumens}`;
    dashFill.style.transform = `scaleX(${player.dashes > 0 ? 1 : 0.12})`;
    staminaFill.style.transform = `scaleX(${Math.max(0.08, player.stamina / MAX_STAMINA)})`;
    updateDebug();
  }

  function updateDebug() {
    if (!debugVisible) return;
    debugPanel.textContent = [
      `fps ${Math.round(fps)}  room ${roomIndex + 1}/${maps.length}`,
      `pos ${player.x.toFixed(1)}, ${player.y.toFixed(1)}`,
      `vel ${player.vx.toFixed(1)}, ${player.vy.toFixed(1)}`,
      `ground ${player.onGround ? 1 : 0}  wall ${player.wallDir}`,
      `coyote ${player.coyote.toFixed(3)}  jbuf ${player.jumpBuffer.toFixed(3)}`,
      `dash ${player.dashes}  dbuf ${player.dashBuffer.toFixed(3)}  dt ${player.dashTimer.toFixed(3)}`,
      `spark ${player.sparkHopTimer.toFixed(3)}  lock ${player.wallJumpLock.toFixed(3)}`,
      `stamina ${(player.stamina * 100).toFixed(0)}  deaths ${deathCount}`,
      `hitstop ${hitStopTimer.toFixed(3)}  ghosts ${ghosts.length}`,
      `trails ${lightTrails.length}  shake ${settings.shake.toFixed(2)}`
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




