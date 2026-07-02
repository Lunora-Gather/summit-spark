"use strict";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateRoomDataSnapshot(snapshot) {
  const errors = [];
  const push = (message) => errors.push(message);

  const {
    maps,
    roomTargets: targets,
    roomNames: names,
    roomTiers: tiers,
    roomSkills: skills,
    skillLabels,
    roomGuides: guides,
    roomPurposes: purposes,
    roomRouteLines: routeLines,
    roomStyleTrials: styleTrials,
    expertRequirements,
    expertRequirementLabels: expertLabels,
    routeContracts,
    feelReplayFixtures: feelFixtures
  } = snapshot;

  if (!Array.isArray(maps)) {
    push("maps must be an array");
    return errors;
  }

  const roomCount = maps.length;
  const roomArrays = {
    ROOM_TARGETS: targets,
    ROOM_NAMES: names,
    ROOM_TIERS: tiers,
    ROOM_SKILLS: skills,
    ROOM_GUIDES: guides,
    ROOM_PURPOSES: purposes,
    ROOM_ROUTE_LINES: routeLines,
    ROOM_STYLE_TRIALS: styleTrials,
    EXPERT_REQUIREMENTS: expertRequirements
  };

  for (const [name, value] of Object.entries(roomArrays)) {
    if (!Array.isArray(value)) push(`${name} must be an array`);
    else if (value.length !== roomCount) push(`${name} has ${value.length} entries, maps has ${roomCount}`);
  }

  if (Array.isArray(names)) {
    names.forEach((name, index) => {
      if (!isNonEmptyString(name)) push(`ROOM_NAMES ${index + 1} must be non-empty`);
    });
  }

  if (Array.isArray(guides)) {
    guides.forEach((guide, index) => {
      if (!isNonEmptyString(guide)) push(`ROOM_GUIDES ${index + 1} must be non-empty`);
    });
  }

  if (Array.isArray(purposes)) {
    purposes.forEach((purpose, index) => {
      if (!isNonEmptyString(purpose)) push(`ROOM_PURPOSES ${index + 1} must be non-empty`);
    });
  }

  if (Array.isArray(targets)) {
    targets.forEach((target, index) => {
      if (!(Number(target) > 0)) push(`ROOM_TARGETS ${index + 1} must be positive`);
      if (index > 0 && target < targets[index - 1]) push(`ROOM_TARGETS should not decrease at room ${index + 1}`);
    });
  }

  const allowedTiers = new Set(["learn", "combine", "pressure", "finale"]);
  if (Array.isArray(tiers)) {
    tiers.forEach((tier, index) => {
      if (!allowedTiers.has(tier)) push(`ROOM_TIERS ${index + 1} has unknown tier ${tier}`);
    });
  }

  const knownSkills = new Set(Object.keys(skillLabels || {}));
  if (Array.isArray(skills)) {
    skills.forEach((roomSkills, roomIndex) => {
      if (!Array.isArray(roomSkills) || roomSkills.length === 0) {
        push(`ROOM_SKILLS ${roomIndex + 1} must be a non-empty array`);
        return;
      }
      for (const skill of roomSkills) {
        if (!knownSkills.has(skill)) push(`ROOM_SKILLS ${roomIndex + 1} references missing label ${skill}`);
      }
    });
  }

  if (Array.isArray(routeLines)) {
    routeLines.forEach((lines, roomIndex) => {
      if (!Array.isArray(lines) || lines.length !== 3) {
        push(`ROOM_ROUTE_LINES ${roomIndex + 1} must contain safe/fast/expert lines`);
        return;
      }
      const expected = ["安全线", "进阶线", "高手线"];
      lines.forEach((line, lineIndex) => {
        if (!isNonEmptyString(line)) push(`ROOM_ROUTE_LINES ${roomIndex + 1}.${lineIndex + 1} must be non-empty`);
        if (!String(line).includes(expected[lineIndex])) {
          push(`ROOM_ROUTE_LINES ${roomIndex + 1}.${lineIndex + 1} should include ${expected[lineIndex]}`);
        }
      });
    });
  }

  const allowedRequirements = new Set(Object.keys(expertLabels || {}));
  if (Array.isArray(styleTrials)) {
    styleTrials.forEach((trial, roomIndex) => {
      if (!trial || typeof trial !== "object") {
        push(`ROOM_STYLE_TRIALS ${roomIndex + 1} must be an object`);
        return;
      }
      for (const key of ["kind", "label", "goal"]) {
        if (!isNonEmptyString(trial[key])) push(`ROOM_STYLE_TRIALS ${roomIndex + 1} missing ${key}`);
      }
      if (typeof trial.clean !== "boolean") push(`ROOM_STYLE_TRIALS ${roomIndex + 1} clean must be boolean`);
      if (!(Number(trial.timeScale) > 1)) push(`ROOM_STYLE_TRIALS ${roomIndex + 1} timeScale must be > 1`);
      const tech = Array.isArray(trial.tech) ? trial.tech : [];
      if (!Array.isArray(trial.tech) || tech.length === 0) push(`ROOM_STYLE_TRIALS ${roomIndex + 1} tech must be non-empty`);
      for (const requirement of tech) {
        if (!allowedRequirements.has(requirement)) push(`ROOM_STYLE_TRIALS ${roomIndex + 1} has unknown tech ${requirement}`);
      }
    });
  }

  if (Array.isArray(expertRequirements)) {
    expertRequirements.forEach((requirements, roomIndex) => {
      if (!Array.isArray(requirements) || requirements.length === 0) {
        push(`EXPERT_REQUIREMENTS ${roomIndex + 1} must be a non-empty array`);
        return;
      }
      for (const requirement of requirements) {
        if (!allowedRequirements.has(requirement)) push(`EXPERT_REQUIREMENTS ${roomIndex + 1} has unknown requirement ${requirement}`);
      }
    });
  }

  const allowedStepModes = new Set(["clean", "pace", "style", "expert"]);
  if (Array.isArray(routeContracts)) {
    routeContracts.forEach((contract, contractIndex) => {
      if (!contract || typeof contract !== "object") {
        push(`ROUTE_CONTRACTS ${contractIndex + 1} must be an object`);
        return;
      }
      for (const key of ["id", "label", "goal"]) {
        if (!isNonEmptyString(contract[key])) push(`ROUTE_CONTRACTS ${contractIndex + 1} missing ${key}`);
      }
      if (!Array.isArray(contract.steps) || contract.steps.length === 0) {
        push(`ROUTE_CONTRACTS ${contractIndex + 1} must include steps`);
      } else {
        for (const step of contract.steps) {
          if (!Number.isInteger(step.index) || step.index < 0 || step.index >= roomCount) {
            push(`ROUTE_CONTRACTS ${contractIndex + 1} has out-of-range room index ${step.index}`);
          }
          if (!allowedStepModes.has(step.mode)) {
            push(`ROUTE_CONTRACTS ${contractIndex + 1} has unknown step mode ${step.mode}`);
          }
        }
      }
    });
  }

  if (Array.isArray(feelFixtures)) {
    feelFixtures.forEach((fixture, fixtureIndex) => {
      if (!fixture || typeof fixture !== "object") {
        push(`FEEL_REPLAY_FIXTURES ${fixtureIndex + 1} must be an object`);
        return;
      }
      if (!isNonEmptyString(fixture.id)) push(`FEEL_REPLAY_FIXTURES ${fixtureIndex + 1} missing id`);
      if (!Number.isInteger(fixture.room) || fixture.room < 1 || fixture.room > roomCount) {
        push(`FEEL_REPLAY_FIXTURES ${fixtureIndex + 1} has invalid room ${fixture.room}`);
      }
      if (!(Number(fixture.maxDelay) > 0)) push(`FEEL_REPLAY_FIXTURES ${fixtureIndex + 1} maxDelay must be positive`);
      if (!Array.isArray(fixture.expected) || fixture.expected.length === 0) {
        push(`FEEL_REPLAY_FIXTURES ${fixtureIndex + 1} expected must be non-empty`);
      }
    });
  }

  return errors;
}

function getRoomDataSummary(snapshot) {
  return {
    rooms: Array.isArray(snapshot.maps) ? snapshot.maps.length : 0,
    routeContracts: Array.isArray(snapshot.routeContracts) ? snapshot.routeContracts.length : 0,
    feelFixtures: Array.isArray(snapshot.feelReplayFixtures) ? snapshot.feelReplayFixtures.length : 0,
    styleTrials: Array.isArray(snapshot.roomStyleTrials) ? snapshot.roomStyleTrials.length : 0,
    expertRequirements: Array.isArray(snapshot.expertRequirements) ? snapshot.expertRequirements.length : 0
  };
}

module.exports = {
  validateRoomDataSnapshot,
  getRoomDataSummary
};
