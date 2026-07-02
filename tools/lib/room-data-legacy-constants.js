"use strict";

const { createRoomDataRuntimeView } = require("./room-data-runtime-view");

const legacyRoomDataConstantMap = Object.freeze({
  maps: "maps",
  roomTargets: "ROOM_TARGETS",
  roomNames: "ROOM_NAMES",
  roomTiers: "ROOM_TIERS",
  roomSkills: "ROOM_SKILLS",
  skillLabels: "SKILL_LABELS",
  roomGuides: "ROOM_GUIDES",
  roomPurposes: "ROOM_PURPOSES",
  roomRouteLines: "ROOM_ROUTE_LINES",
  roomStyleTrials: "ROOM_STYLE_TRIALS",
  expertRequirements: "EXPERT_REQUIREMENTS",
  expertRequirementLabels: "EXPERT_REQUIREMENT_LABELS",
  routeContracts: "ROUTE_CONTRACTS",
  feelReplayFixtures: "FEEL_REPLAY_FIXTURES"
});

const legacyRoomDataConstantNames = Object.freeze(Object.values(legacyRoomDataConstantMap));

function createLegacyRoomDataConstants(snapshotOrView) {
  const view = createRoomDataRuntimeView(snapshotOrView);
  const legacyConstants = {};

  for (const [runtimeField, legacyName] of Object.entries(legacyRoomDataConstantMap)) {
    legacyConstants[legacyName] = view[runtimeField];
  }

  return Object.freeze(legacyConstants);
}

module.exports = {
  legacyRoomDataConstantMap,
  legacyRoomDataConstantNames,
  createLegacyRoomDataConstants
};
