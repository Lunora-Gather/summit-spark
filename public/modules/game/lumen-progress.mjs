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
