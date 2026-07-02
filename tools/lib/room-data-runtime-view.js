"use strict";

const runtimeRoomDataFields = [
  "roomCount",
  "maps",
  "roomTargets",
  "roomNames",
  "roomTiers",
  "roomSkills",
  "skillLabels",
  "roomGuides",
  "roomPurposes",
  "roomRouteLines",
  "roomStyleTrials",
  "expertRequirements",
  "expertRequirementLabels",
  "routeContracts",
  "feelReplayFixtures"
];

function assertSnapshotObject(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("room data snapshot must be an object");
  }
}

function createRoomDataRuntimeView(snapshot) {
  assertSnapshotObject(snapshot);

  const view = {};
  for (const field of runtimeRoomDataFields) {
    if (!(field in snapshot)) {
      throw new Error(`room data snapshot is missing required field: ${field}`);
    }
    view[field] = snapshot[field];
  }

  return view;
}

module.exports = {
  runtimeRoomDataFields,
  createRoomDataRuntimeView
};
