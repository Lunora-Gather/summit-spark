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

export function missedRoomLumensData(maps, collected, roomTimes, currentRoom) {
  const rooms = [];
  for (const [index, rows] of maps.entries()) {
    if (index !== currentRoom && !(roomTimes[index] > 0)) continue;
    const locations = [];
    for (const [y, row] of rows.entries()) {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === "L" && !collected.has(`${index}:${x}:${y}`)) {
          const cx = (x + 0.5) / row.length;
          const cy = (y + 0.5) / rows.length;
          const section = cx < 1 / 3 ? "前段" : cx < 2 / 3 ? "中段" : "后段";
          const height = cy < 1 / 3 ? "高处" : cy < 2 / 3 ? "中层" : "低处";
          locations.push(section + height);
        }
      }
    }
    if (locations.length) rooms.push({ index, locations });
  }
  return rooms;
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
