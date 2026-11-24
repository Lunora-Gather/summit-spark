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

module.exports = { routes, replayOldPeakStyle };
