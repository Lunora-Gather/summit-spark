"use strict";

// Each beat lasts 12 frames at 60 Hz. The suffix gives the jump or dash direction.
// The shared lower loop visits both rings above the spikes and the middle spring.
const entry = "right/dash right/up left/down right right right/dash";
const lowerLoop = entry + " right wait right/down left left/down left/down wait/down right/dash right right right/up right/jump right/up right/down right/dash right";
const throughGate = lowerLoop + " right/dash right/dash";
const routes = {
  complete: throughGate + " wait right/up right right/dash wait left wait/up right/down wait wait left/dash right/dash right/jump right",
  shortcut: entry + " right right right/down right/jump right/dash right right/dash right/down right/dash right/dash left right/dash right/jump right/dash right/down right/down right",
  skim: throughGate + " wait right/down right/dash right wait/down wait/up right/down wait left left/dash right/dash right right/dash",
  earlyLanding: lowerLoop + " right/dash right/down right/dash right/jump right right wait/down wait left/up right right/down right left left/dash left/down left/up left left/jump right/up left left/jump left right/up right/jump right right/down right/dash right right/dash"
};

// Installed only into the local test page so observations can read the same
// objects used by collision detection. Movement comes entirely from key events.
function replayOldPeakStyle(route) {
  startRoomDrill(5, "style");
  const attempt = room;
  const tech = roomTech;
  const before = drillContractStats(5, "style");
  const bindings = effectiveBindings();
  const held = new Set();
  const key = (name, down) => {
    if (held.has(name) === down) return;
    if (down) held.add(name);
    else held.delete(name);
    window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code: bindings[name], bubbles: true, cancelable: true }));
  };
  const release = () => { for (const name of held) key(name, false); };
  const tick = () => frame(lastTime + 1000 / 60);
  let earlyLanding = false;
  let progress = "";
  let elapsed = 0;
  tick();
  for (const beat of route.split(" ")) {
    const [direction, action] = beat.split("/");
    if (direction !== "wait") key(direction, true);
    if (action === "up" || action === "down") key(action, true);
    if (action) key(action === "jump" ? "jump" : "dash", true);
    for (let i = 0; i < 12 && room === attempt && !deathCount; i++) {
      if (i === 3) key("dash", false);
      if (i === 9) key("jump", false);
      tick();
      if (room !== attempt) break;
      elapsed = roomTime;
      progress = activeStyleProgress();
      if (!tech.gate && player.onGround && attempt.entities.phaseBlocks.some(block =>
        block.active && Math.abs(player.y + player.h - block.y) <= 1 &&
        player.x < block.x + block.w && player.x + player.w > block.x)) earlyLanding = true;
    }
    release();
    if (room !== attempt || deathCount) break;
  }
  const after = drillContractStats(5, "style");
  return {
    relays: attempt.entities.relays.filter(relay => relay.awakened).length,
    springs: attempt.entities.springs.filter(spring => spring.used).length,
    apex: tech.springApex, gate: tech.gate, nearPhase: tech.phase, landed: tech.gatePhaseLanding,
    earlyLanding, progress, elapsed, deaths: deathCount, nextRoom: roomIndex + 1, feedback: focusPopupDetail,
    wins: after.wins - before.wins, retries: after.starts - before.starts, nextProgress: activeStyleProgress()
  };
}

// Isolate the clock/clean boundary from the movement replay above.
function checkOldPeakStyleGuidance() {
  for (const [elapsed, clean] of [[35, true], [35.001, true], [20, false]]) {
    startRoomDrill(5, "style");
    if (!clean) quickRetry();
    const attempt = room;
    const before = drillContractStats(5, "style").wins;
    roomTime = elapsed;
    update(1 / 120);
    if (room !== attempt || activeDrill?.mode !== "style") throw Error("R6 practice interrupted before the exit");
    roomTime = elapsed;
    const eligible = elapsed <= 35 && clean;
    const partialTarget = routeCompassTarget();
    const partialBeacons = activeRequirementKeys();
    if (eligible !== Boolean(partialTarget) || partialTarget?.label === "出口" || eligible !== Boolean(partialBeacons.length)
      || (!eligible && !activeStyleProgress().includes("重练"))) {
      throw Error(`R6 unfinished at ${elapsed}s, clean=${clean}: compass ${partialTarget?.label}, beacons ${partialBeacons}`);
    }
    for (const relay of room.entities.relays) relay.awakened = true;
    for (const spring of room.entities.springs) spring.used = true;
    Object.assign(roomTech, { relay: true, spring: true, springApex: true, gate: true, gatePhaseLanding: true });
    const progress = activeStyleProgress();
    const target = routeCompassTarget();
    if (eligible ? !progress.includes("前往出口") || target?.label !== "出口"
      : !progress.includes("重练") || progress.includes("出口") || target) {
      throw Error(`R6 completed actions at ${elapsed}s, clean=${clean}: ${progress}, compass ${target?.label}`);
    }
    player.x = roomWorldWidth() + 4;
    resolveRoomTransition();
    if (drillContractStats(5, "style").wins !== before + Number(eligible) || roomIndex !== (eligible ? 6 : 5)) {
      throw Error(`R6 exit disagrees with guidance at ${elapsed}s, clean=${clean}`);
    }
  }
}

function checkOldPeakCampHint() {
  hardReset();
  resetToStart(5);
  updatePortraitBrief();
  const entrance = portraitRoomGoal.textContent;
  const camp = room.entities.waypoints[0];
  player.x = camp.x - player.w / 2;
  player.y = camp.y - player.h / 2;
  updateEntities(0, { x: 0, y: 0 });
  quickRetry();
  const retry = portraitRoomGoal.textContent;
  if (Math.abs(player.x + player.w / 2 - camp.x) > 1 || retry.includes("入口") || !retry.includes("破门")) {
    throw Error(`R6 camp retry should guide the player through the gate: ${retry}`);
  }
  restartCurrentRoom();
  if (!entrance.includes("入口弹簧") || portraitRoomGoal.textContent !== entrance) {
    throw Error(`R6 room restart should restore the entrance hint: ${portraitRoomGoal.textContent}`);
  }
}

module.exports = { routes, replayOldPeakStyle, checkOldPeakStyleGuidance, checkOldPeakCampHint };
