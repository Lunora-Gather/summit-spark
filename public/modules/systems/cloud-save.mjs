function conflict(remoteRow, remoteKnown = true) {
  return Object.assign(new Error("云端进度已被其他设备更新"), {
    type: "cloud_save_conflict",
    remoteRow,
    remoteKnown
  });
}

function sameRevision(left, right) {
  if (!left || !right) return !left && !right;
  return left.$updatedAt === right.$updatedAt && left.archive === right.archive;
}

async function readRow(tables, location) {
  try { return await tables.getRow(location); }
  catch (error) {
    if (Number(error?.code) === 404) return null;
    throw error;
  }
}

// Stage first: Appwrite captures the row's version at staging. Read the committed
// row afterwards to catch changes before staging; commit catches changes after
// staging. A GET followed by an ordinary upsert would leave an overwrite race.
export async function commitCloudSave(tables, { location, expectedRow, data, permissions }) {
  let transactionId = "";
  let committed = false;
  try {
    const transaction = await tables.createTransaction({ ttl: 60 });
    transactionId = transaction.$id;
    if (!transactionId) throw new Error("云端事务未就绪");
    await tables.upsertRow({ ...location, data, permissions, transactionId });
    const current = await readRow(tables, location);
    if (!sameRevision(expectedRow, current)) throw conflict(current);
    await tables.updateTransaction({ transactionId, commit: true });
    committed = true;
    // Staged timestamps differ from committed timestamps. Never acknowledge a
    // staged response or silently accept another writer's post-commit result.
    const saved = await readRow(tables, location);
    if (!saved || saved.archive !== data.archive) throw conflict(saved);
    return saved;
  } catch (error) {
    if (error?.type === "cloud_save_conflict") throw error;
    if (Number(error?.code) === 409) {
      let remote;
      try { remote = await readRow(tables, location); }
      catch { throw conflict(undefined, false); }
      throw conflict(remote);
    }
    throw error;
  } finally {
    if (transactionId && !committed) {
      try { await tables.updateTransaction({ transactionId, rollback: true }); }
      catch { /* Failed commits and expired transactions may already be closed. */ }
    }
    if (transactionId) {
      try { await tables.deleteTransaction({ transactionId }); }
      catch { /* TTL bounds abandoned transactions when cleanup is unavailable. */ }
    }
  }
}
