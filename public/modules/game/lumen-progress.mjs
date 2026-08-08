function normalizedRoomIndex(value) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function resetRoomLumenProgressData(collectedIds, roomIndex) {
  const prefix = `${normalizedRoomIndex(roomIndex)}:`;
  const source = collectedIds instanceof Set
    ? collectedIds
    : new Set(Array.isArray(collectedIds) ? collectedIds : []);
  const collected = new Set();
  let removed = 0;

  source.forEach((id) => {
    if (typeof id !== "string") return;
    if (id.startsWith(prefix)) {
      removed += 1;
      return;
    }
    collected.add(id);
  });

  return { collected, removed };
}

function validRoomLumenId(id, roomIndex, rows) {
  if (typeof id !== "string" || !Array.isArray(rows)) return false;
  const match = id.match(/^(\d+):(\d+):(\d+)$/);
  if (!match || Number(match[1]) !== normalizedRoomIndex(roomIndex)) return false;
  const x = Number(match[2]);
  const y = Number(match[3]);
  return rows[y]?.[x] === "L";
}

export function roomLumenCheckpointData(collectedIds, roomIndex, rows) {
  const source = collectedIds instanceof Set
    ? collectedIds
    : new Set(Array.isArray(collectedIds) ? collectedIds : []);
  return [...source].filter((id) => validRoomLumenId(id, roomIndex, rows));
}

export function restoreRoomLumenCheckpointData(collectedIds, savedIds, roomIndex, rows) {
  const collected = collectedIds instanceof Set
    ? new Set(collectedIds)
    : new Set(Array.isArray(collectedIds) ? collectedIds : []);
  const snapshot = roomLumenCheckpointData(savedIds, roomIndex, rows);
  snapshot.forEach((id) => collected.add(id));
  return { collected, snapshot, restored: snapshot.length };
}
