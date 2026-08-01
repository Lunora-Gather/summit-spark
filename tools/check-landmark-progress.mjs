#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  MOUNTAIN_GATE_LANDMARK_KINDS,
  OLD_PEAK_RELAY_LANDMARK_KINDS,
  mountainGateLandmarkProgress,
  oldPeakRelayLandmarkProgress
} from "../public/modules/game/landmark-progress.mjs";

assert.deepEqual(MOUNTAIN_GATE_LANDMARK_KINDS, ["gate-steps", "relay-bridge", "mist-springs"]);
assert.deepEqual(OLD_PEAK_RELAY_LANDMARK_KINDS, ["triple-link", "switchback", "broken-gate"]);
assert.ok(Object.isFrozen(MOUNTAIN_GATE_LANDMARK_KINDS));
assert.ok(Object.isFrozen(OLD_PEAK_RELAY_LANDMARK_KINDS));

assert.equal(mountainGateLandmarkProgress("gate-steps", { roomTech: {} }), 0);
assert.equal(mountainGateLandmarkProgress("gate-steps", { roomTech: { spark: true } }), 1);
assert.equal(mountainGateLandmarkProgress("relay-bridge", {
  relays: [{ awakened: true }, { awakened: false }]
}), 0.5);
assert.equal(mountainGateLandmarkProgress("relay-bridge", {
  relays: [{ awakened: true }, { awakened: true }]
}), 1);
assert.equal(mountainGateLandmarkProgress("mist-springs", { roomTech: { spring: true } }), 0.5);
assert.equal(mountainGateLandmarkProgress("mist-springs", {
  roomTech: { spring: true, springApex: true }
}), 1);

for (const kind of OLD_PEAK_RELAY_LANDMARK_KINDS) {
  assert.equal(oldPeakRelayLandmarkProgress(kind, [
    { awakened: true },
    { awakened: false },
    { awakened: true }
  ]), 2 / 3);
}

assert.equal(mountainGateLandmarkProgress("unknown", { roomTech: { spark: true } }), 0);
assert.equal(mountainGateLandmarkProgress("relay-bridge", { relays: [] }), 0);
assert.equal(mountainGateLandmarkProgress("relay-bridge", { relays: [{ awakened: 1 }] }), 0);
assert.equal(mountainGateLandmarkProgress("mist-springs", null), 0);
assert.equal(oldPeakRelayLandmarkProgress("relay-bridge", [{ awakened: true }]), 0);
assert.equal(oldPeakRelayLandmarkProgress("switchback", null), 0);

console.log("Landmark progress checks passed: Mountain Gate lessons and Old Peak Relay restoration stay bounded and attempt-local.");
