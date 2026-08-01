const MOUNTAIN_GATE_KINDS = Object.freeze([
  "gate-steps",
  "relay-bridge",
  "mist-springs"
]);

const OLD_PEAK_RELAY_KINDS = Object.freeze([
  "triple-link",
  "switchback",
  "broken-gate"
]);

export const MOUNTAIN_GATE_LANDMARK_KINDS = MOUNTAIN_GATE_KINDS;
export const OLD_PEAK_RELAY_LANDMARK_KINDS = OLD_PEAK_RELAY_KINDS;

function awakenedRelayProgress(relays) {
  if (!Array.isArray(relays) || relays.length === 0) return 0;
  const awakened = relays.reduce((count, relay) => count + Number(relay?.awakened === true), 0);
  return awakened / relays.length;
}

export function mountainGateLandmarkProgress(kind, options = {}) {
  const roomTech = options?.roomTech && typeof options.roomTech === "object" ? options.roomTech : {};
  if (kind === "gate-steps") return roomTech.spark === true ? 1 : 0;
  if (kind === "relay-bridge") return awakenedRelayProgress(options?.relays);
  if (kind === "mist-springs") {
    return (Number(roomTech.spring === true) + Number(roomTech.springApex === true)) / 2;
  }
  return 0;
}

export function oldPeakRelayLandmarkProgress(kind, relays) {
  if (!OLD_PEAK_RELAY_KINDS.includes(kind)) return 0;
  return awakenedRelayProgress(relays);
}
