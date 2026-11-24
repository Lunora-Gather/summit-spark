"use strict";

// Each line reaches one collectible from the previous landing. R10 ends with
// an extra line for the summit. An action spans 16 frames of a 60 Hz replay.
const collectorRoute = [
  [ // R1
    "dashRight dashRight dashRight jumpRight dashUpRight jumpRight right right jumpRight dashUpRight dashUp left",
  ],
  [ // R2
    "dashRight right dashRight dashRight dashRight",
    "dashRight jump dashUp jumpLeft wait",
  ],
  [ // R3
    "dashRight dashRight jumpRight dashRight jumpRight right dashRight",
    "dashRight wait right",
  ],
  [ // R4
    "right right right wait jump right left right left right jumpLeft dashRight left wait wait wait jumpLeft dashUp right wait dashRight left left jumpLeft",
  ],
  [ // R5
    "dashRight dashRight right dashRight jumpRight right dashRight jumpRight right dashRight right dashRight jumpRight right",
  ],
  [ // R6
    "right jumpRight dashRight right dashRight jumpRight dashRight dashUpRight",
  ],
  [ // R7
    "dashRight dashRight dashRight dashRight dashRight dashRight jumpRight right dashRight jumpRight dashRight jumpRight right",
  ],
  [ // R8
    "dashRight dashRight jumpRight right dashRight jumpRight dashRight right right",
  ],
  [ // R9
    "dashRight dashRight wait",
  ],
  [ // R10
    "dashUpRight jumpRight right",
    "dashRight dashRight dashRight right dashRight dashRight jumpRight dashUpRight jumpRight right right dashUpRight jumpLeft",
  ],
];
// These functions run in an isolated browser page. Only the display clock is
// controlled; the shipped game owns its inputs, physics, renderer and save.
function installCollectionClock() {
  let time = 100;
  let nextId = 0;
  const callbacks = new Map();
  Object.defineProperty(performance, "now", {value: () => time});
  window.requestAnimationFrame = callback => {
    callbacks.set(++nextId, callback);
    return nextId;
  };
  window.cancelAnimationFrame = id => callbacks.delete(id);
  window.stepCollectionFrame = () => {
    time += 1000 / 60;
    const pending = [...callbacks.values()];
    callbacks.clear();
    for (const callback of pending) callback(time);
  };
}

function startCollectionReplay(route) {
  const read = id => document.getElementById(id)?.textContent || "";
  const room = () => Number(/^R(\d+)\/10/.exec(read("roomCount"))?.[1]);
  if (!document.querySelector("#overlay").hidden || room() !== 1 ||
      document.querySelector("#assistMode")?.value !== "off") throw Error("Expected a fresh unassisted run in R1");

  const actions = {
    wait: [], right: ["KeyD"], left: ["KeyA"], jump: ["Space"],
    jumpRight: ["KeyD", "Space"], jumpLeft: ["KeyA", "Space"], dashRight: ["KeyD", "KeyK"],
    dashUpRight: ["KeyD", "KeyW", "KeyK"], dashUpLeft: ["KeyA", "KeyW", "KeyK"], dashUp: ["KeyW", "KeyK"]
  };
  const held = new Set();
  function key(code, down) {
    if (down === held.has(code)) return;
    if (down) held.add(code);
    else held.delete(code);
    window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", {code, bubbles: true, cancelable: true}));
  }
  function release() {
    for (const code of held) key(code, false);
  }
  let frame = 0, collected = 0;
  const visited = [];
  function verify(ok, reason) {
    if (!ok) throw Error(reason + " at frame " + frame + " (" + [read("roomCount"), read("lumenCount"), read("gameStatus")].join(" · ") + ")");
  }
  function* routeFrames() {
    yield; // Let the fresh player settle before pressing a direction.
    for (let i = 0; i < route.length; i++) {
      const number = i + 1;
      verify(room() === number, "Expected to enter R" + number);
      visited.push(number);
      if (number === 2) {
        verify(!document.querySelector("#gameTip.lumen:not(.hidden)"), "Previous pickup still covers the new room");
      }
      if ([4, 7, 9].includes(number)) {
        const introFrames = matchMedia("(prefers-reduced-motion: reduce)").matches ? 72 : 108;
        for (let f = 0; f < introFrames; f++) yield;
      }
      const paths = route[i];
      for (const [index, path] of paths.entries()) {
        for (const move of path.split(" ")) {
          for (const code of actions[move]) key(code, true);
          for (let f = 0; f < 16; f++) {
            if (f === 3) key("KeyK", false);
            if (f === 10) key("Space", false);
            yield;
          }
          release();
        }
        if (number !== 10 || index === 0) {
          collected++;
          verify(read("lumenCount") === collected + "/12", "Missed collectible " + collected + " in R" + number);
        }
      }
      if (number === 10) break;
      // Follow the low exit line with regular jump taps. The gold door in R4
      // needs two timed dashes. Stop on the visible room change.
      const gate = number === 4, offset = gate ? 30 : 0, interval = gate ? 66 : 54;
      key("KeyD", true);
      for (let f = 0; room() === number && f < 650; f++) {
        if (f >= offset && (f - offset) % interval === 0) key("Space", true);
        if (f >= offset + 10 && (f - offset - 10) % interval === 0) key("Space", false);
        if (gate && (f === 32 || f === 45)) key("KeyK", true);
        if (gate && (f === 34 || f === 47)) key("KeyK", false);
        yield;
      }
      release();
    }
    for (let f = 0; !read("finishTitle") && f < 180; f++) yield;
    const stats = Object.fromEntries([...document.querySelectorAll(".finish-stats > span")].map(item => [
      item.querySelector("em").textContent, item.querySelector("strong").textContent
    ]));
    const fullRun = document.querySelector(".finish-line")?.textContent.startsWith("新的山径纪录");
    verify(fullRun && read("finishTitle") === "登顶" && stats["微光"] === "12/12" && stats["失误"] === "0" &&
      parseInt(stats["最长连锁"], 10) > 0, "Missing full-collection summit result " + JSON.stringify(stats));
    return {rooms: visited.length, collected, frames: frame, time: stats["用时"], chain: stats["最长连锁"]};
  }
  const playback = routeFrames();
  window.runCollectionBatch = size => {
    for (let i = 0; i < size; i++) {
      const next = playback.next();
      if (next.done) return next.value;
      window.stepCollectionFrame();
      frame++;
      verify(read("deathCount") === "失 0", "Collection route lost a life");
    }
    return null;
  };
}

module.exports = {collectorRoute, installCollectionClock, startCollectionReplay};
