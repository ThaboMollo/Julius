# Julius Sync Policy

This document describes how local IndexedDB data and the Supabase cloud
mirror are kept consistent when a user is signed in. It is the source of
truth for sync behaviour decisions; tests in `src/sync/SyncOrchestrator.test.ts`
enforce the parts that are hard to verify by inspection.

## Goals

1. **Local-first.** Every write goes to IndexedDB first. The UI never blocks
   on the network.
2. **Eventual consistency.** Cloud and local converge after each successful
   sync cycle.
3. **No data loss on transient failures.** A failed cloud round-trip never
   leaves the user with rows visible locally that cannot be recovered.

## Conflict resolution

**Last-write-wins (LWW) by ISO `updated_at` timestamp.**

When the same row exists on both sides, the side with the later `updated_at`
wins. Equality goes to the cloud (treated as `>=`).

Rationale: a budget tracker has very few concurrent edits to the same row.
The simplicity of LWW outweighs the marginal correctness gain of a CRDT
or operation-log scheme. If we ever observe real conflict-loss in practice,
we revisit (see "When to upgrade", below).

## Sync cycle

`SyncOrchestrator.runOnLogin(userId)` runs in this order:

```
ensureSyncState  →  migrate __local__ rows  →  dedup  →  pull  →  push
```

Per-user dedup: a Map of in-flight Promises in the orchestrator means two
concurrent `runOnLogin` calls for the same user share one execution.
Different users run in parallel.

### Pull

For each table (in declared order — see `TABLE_ORDER`):

1. Query Supabase for rows where `user_id = userId` and `updated_at > lastPullAt`.
2. For each cloud row: if no local row, insert. If local exists and cloud
   `updated_at >= local updatedAt`, overwrite local. Otherwise skip.

The watermark advances to the **maximum `updated_at` across all rows pulled
in this cycle**, not the wall-clock time the pull started. This eliminates
the race where a row updated server-side at exactly the pre-pull timestamp
would be skipped on the next sync.

### Push

For each table:

1. Read all local rows for `userId` where `updatedAt > lastPushAt`.
2. Upsert in one Supabase round-trip with `onConflict: 'id'`.

### Migration

`migrateLocalRowsToUser` rescopes `__local__` rows (created before login)
to the authenticated `userId`. It runs in two passes:

- Pass 1 — local: rewrite each row's `userId` and `updatedAt` in IndexedDB.
- Pass 2 — cloud: upsert the rescoped rows to Supabase.

If pass 2 fails for any table, the function throws. The user-visible state:
local rows are scoped to `userId` and are visible in the UI; the cloud has
not received them yet. The next successful sync's regular push pass picks
them up via the `updatedAt > lastPushAt` filter (lastPushAt is still the
pre-failure value because the push pass was never reached). This is why we
do not wrap the rescope in a Dexie transaction that rolls back on cloud
failure: rolling back would hide rows from the UI for an offline user.

## Error surfacing

Every stage emits an `obs.event` via `src/services/observability`:

- `sync.start` / `sync.success` / `sync.failure { stage }`
- `storage.quota` when a Dexie `.toArray()` hits the quota cap
- `render.error` from `ErrorBoundary` and global `error` / `unhandledrejection`
  handlers

`AuthProvider` listens for `sync.failure` and shows a non-blocking toast:
"Sync failed — your data is safe locally. We'll retry on the next sync."

## Auto-retry

`AuthProvider` registers `window` `focus` and `online` listeners. If
`syncStatus` is `'error'` or `'idle'`, retry once. The orchestrator's
`inFlightByUser` map prevents double-firing against the on-login sync.

This covers the common offline-to-online and tab-revisit cases without a
persistent retry queue. A persistent outbox / dead-letter design is
deferred (see "When to upgrade").

## When to upgrade this design

Triggers that would justify moving beyond hardened LWW:

- Multiple users reporting concurrent-edit data loss across devices.
- A failure mode where a row is visible in the UI but never reaches the
  cloud, persisting across multiple retry windows.
- A regulatory or backup requirement that needs an audit trail per write.

Candidate upgrades, in order of cost:

1. **Persistent retry queue** — Dexie `syncOutbox` + `syncDeadLetter`
   tables, exponential backoff. Mostly reduces user-visible failure surface.
2. **Operation log per device** — append-only log of mutations replayed on
   conflict. Catches the "edit on phone while delete on laptop" case.
3. **Per-row CRDT** (`yjs` or `automerge`) — full multi-device safety.
   Significant schema change.

We chose hardened LWW over options 1–3 because the audited failure surface
did not justify the complexity. Revisit if the triggers above fire.
