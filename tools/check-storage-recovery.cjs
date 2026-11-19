"use strict";

// Both browser drivers execute the supplied callbacks in the game's own origin.
async function checkStorageRecovery(evaluate, reload) {
  await evaluate(() => {
    localStorage.setItem("summit-spark-settings", "{bad json");
    localStorage.setItem("summit-spark-profile", JSON.stringify({ summitClears: -5, bestDeathCount: "bad", challengeWins: { clear: true, bad: true } }));
    localStorage.setItem("summit-spark-room-bests", JSON.stringify([2, -4, "bad", 9]));
    localStorage.setItem("summit-spark-room-paths", JSON.stringify([[{ x: 20, y: 30, t: 0, dash: true }], "bad", [{ x: -999999, y: "bad", t: -2 }]]));
    localStorage.setItem("summit-spark-focus", "not-json");
  });
  await reload();
  const state = await evaluate(() => ({
    ready: document.documentElement.classList.contains("app-ready"),
    settingsOk: !!document.querySelector("#settingsButton"),
    storageTip: document.querySelector("#gameTip").classList.contains("storage"),
    tipTitle: document.querySelector("#gameTipTitle").textContent
  }));
  const errors = [];
  if (!state.ready || !state.settingsOk) errors.push("app did not recover from corrupted storage");
  if (!state.storageTip || !/存档/.test(state.tipTitle)) errors.push("storage recovery did not show a one-shot storage toast");
  return errors;
}

module.exports = { checkStorageRecovery };
