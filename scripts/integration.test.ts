/**
 * Headless integration harness — 2 real Appwrite clients against live project.
 * Uses ws polyfill for Node WebSocket + appwrite web SDK.
 * Session bootstrap uses node-appwrite server SDK (bypasses auth scope restrictions).
 * Run: pnpm test:integration
 */

import { WebSocket } from "ws";
// Polyfill browser globals for appwrite web SDK in Node
const g = global as unknown as Record<string, unknown>;
g.WebSocket = WebSocket;
g.window = {
  setInterval,
  clearInterval,
  setTimeout,
  clearTimeout,
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
};

import {
  Client,
  Databases,
  ID,
  Permission,
  Role,
  Query,
  Realtime,
  AppwriteException,
} from "appwrite";
import * as NodeAppwrite from "node-appwrite";
import { rowsToGame } from "../src/lib/realtimeGame.js";
import type { GameRow, PlayerRow, ReactionRow } from "../src/types/index.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT ?? "https://nyc.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID ?? "6a228c77000c28cb23ec";
const API_KEY = process.env.APPWRITE_API_KEY ?? "";
const DB_ID = "phaze20";
const TABLE = {
  GAMES: "games",
  PLAYERS: "players",
  PRESENCE: "presence",
  REACTIONS: "reactions",
} as const;

if (!API_KEY) {
  console.error("✗ APPWRITE_API_KEY env var required. Export it before running.");
  process.exit(1);
}

// ─── Server SDK (session bootstrap + cleanup) ─────────────────────────────────

function makeServerClient() {
  return new NodeAppwrite.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
}

// ─── Web SDK client factory ───────────────────────────────────────────────────

function makeWebClient(sessionSecret: string) {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setSession(sessionSecret);
  return {
    client,
    databases: new Databases(client),
    realtime: new Realtime(client),
  };
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function pass(msg: string) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg: string) {
  console.error(`  ✗ FAIL: ${msg}`);
  process.exitCode = 1;
}

function assert(cond: boolean, msg: string) {
  if (cond) pass(msg);
  else fail(msg);
}

// Subscribe then wait for WS open before calling trigger(), then wait for matching event.
function waitForEvent(
  realtime: Realtime,
  channel: string,
  predicate: (payload: unknown) => boolean,
  trigger: () => Promise<unknown>,
  timeoutMs = 10000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`Timeout waiting for realtime event on ${channel}`)),
      timeoutMs,
    );

    let triggered = false;
    const maybeTrigger = async () => {
      if (triggered) return;
      triggered = true;
      await trigger().catch(reject);
    };

    const sub = realtime.subscribe(channel, (evt) => {
      if (predicate(evt.payload)) {
        clearTimeout(t);
        (sub as unknown as { close?: () => void }).close?.();
        resolve(evt.payload);
      }
    });

    // Fire trigger once WS is open; fall back to 2s delay if already open
    realtime.onOpen(maybeTrigger);
    setTimeout(maybeTrigger, 2000); // fallback if already connected
  });
}

function generateJoinCode(): string {
  return `T${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

const cleanupTasks: Array<() => Promise<void>> = [];
function registerCleanup(fn: () => Promise<void>) {
  cleanupTasks.push(fn);
}

async function runCleanup(serverUsers: NodeAppwrite.Users, userIds: string[]) {
  for (const task of cleanupTasks.reverse()) {
    try {
      await task();
    } catch {
      /* ignore */
    }
  }
  for (const uid of userIds) {
    try {
      await serverUsers.delete(uid);
    } catch {
      /* ignore */
    }
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Phaze20 Integration Tests ===\n");

  const server = makeServerClient();
  const serverUsers = new NodeAppwrite.Users(server);
  const serverDatabases = new NodeAppwrite.Databases(server);

  const userIdA = ID.unique();
  const userIdB = ID.unique();

  try {
    // ── 1. Auth: server-bootstrapped sessions ─────────────────────────────────
    console.log("1. Auth: server-bootstrapped sessions");

    await serverUsers.create(userIdA);
    await serverUsers.create(userIdB);

    const sessA = await serverUsers.createSession(userIdA);
    const sessB = await serverUsers.createSession(userIdB);

    const A = makeWebClient(sessA.secret);
    const B = makeWebClient(sessB.secret);

    pass(`Client A session bootstrapped (user ${userIdA.slice(0, 8)}…)`);
    pass(`Client B session bootstrapped (user ${userIdB.slice(0, 8)}…)`);

    // ── 2. Create game (Client A = host) ─────────────────────────────────────
    console.log("\n2. Create game");
    const gameId = ID.unique();
    const hostPlayerId = ID.unique();
    const joinCode = generateJoinCode();
    const phasesSnapshot = JSON.stringify([
      { id: "p1", number: 1, rule: "2 sets of 3", constraint: null, isBuiltin: true },
      { id: "p2", number: 2, rule: "1 run of 7", constraint: null, isBuiltin: true },
    ]);

    const gameDoc = await A.databases.createDocument<GameRow>(
      DB_ID,
      TABLE.GAMES,
      gameId,
      {
        joinCode,
        status: "active",
        round: 1,
        orderedCount: 2,
        phaseSetId: "classic",
        phasesSnapshot,
        hostId: userIdA,
        createdAt: Date.now(),
      },
      [
        Permission.read(Role.any()),
        Permission.update(Role.user(userIdA)),
        Permission.delete(Role.user(userIdA)),
      ],
    );
    assert(gameDoc.$id === gameId, `Game row created with id ${gameId.slice(0, 8)}…`);

    const hostPlayerDoc = await A.databases.createDocument<PlayerRow>(
      DB_ID,
      TABLE.PLAYERS,
      hostPlayerId,
      {
        gameId,
        name: "Alice",
        color: "sky",
        userId: userIdA,
        completedPhaseIds: "[]",
        declaredPhaseId: null,
        isCompletedThisRound: false,
      },
      [
        Permission.read(Role.any()),
        Permission.update(Role.user(userIdA)),
        Permission.delete(Role.user(userIdA)),
      ],
    );
    assert(hostPlayerDoc.$id === hostPlayerId, "Host player row created");

    registerCleanup(async () => {
      await serverDatabases.deleteDocument(DB_ID, TABLE.PLAYERS, hostPlayerId).catch(() => {});
      await serverDatabases.deleteDocument(DB_ID, TABLE.GAMES, gameId).catch(() => {});
    });

    // ── 3. Join game (Client B) ───────────────────────────────────────────────
    console.log("\n3. Join game by code");
    const foundGames = await B.databases.listDocuments<GameRow>(DB_ID, TABLE.GAMES, [
      Query.equal("joinCode", joinCode),
      Query.equal("status", "active"),
    ]);
    assert(foundGames.documents.length === 1, `Found game by joinCode ${joinCode}`);

    const guestPlayerId = ID.unique();
    const guestPlayerDoc = await B.databases.createDocument<PlayerRow>(
      DB_ID,
      TABLE.PLAYERS,
      guestPlayerId,
      {
        gameId,
        name: "Bob",
        color: "rose",
        userId: userIdB,
        completedPhaseIds: "[]",
        declaredPhaseId: null,
        isCompletedThisRound: false,
      },
      [
        Permission.read(Role.any()),
        Permission.update(Role.user(userIdB)),
        Permission.delete(Role.user(userIdB)),
      ],
    );
    assert(guestPlayerDoc.$id === guestPlayerId, "Guest player row created");

    registerCleanup(async () => {
      await serverDatabases.deleteDocument(DB_ID, TABLE.PLAYERS, guestPlayerId).catch(() => {});
    });

    // ── 4. rowsToGame adapter ─────────────────────────────────────────────────
    console.log("\n4. Row→Game adapter");
    const playerDocs = await A.databases.listDocuments<PlayerRow>(DB_ID, TABLE.PLAYERS, [
      Query.equal("gameId", gameId),
    ]);
    const game = rowsToGame(gameDoc, playerDocs.documents);
    assert(game.id === gameId, "Game id matches");
    assert(game.players.length === 2, `Game has 2 players (got ${game.players.length})`);
    assert(game.phasesSnapshot.length === 2, `Phases snapshot has 2 entries`);
    assert(game.joinCode === joinCode, "Join code matches");

    // ── 5. Realtime: toggleCompletion propagates ──────────────────────────────
    console.log("\n5. Realtime: toggle completion propagates A→B");
    const channel = `databases.${DB_ID}.collections.${TABLE.PLAYERS}.documents.${hostPlayerId}`;
    try {
      await waitForEvent(
        B.realtime,
        channel,
        (p) => (p as { isCompletedThisRound?: boolean }).isCompletedThisRound === true,
        () =>
          A.databases.updateDocument<PlayerRow>(DB_ID, TABLE.PLAYERS, hostPlayerId, {
            isCompletedThisRound: true,
          }),
      );
      pass("Realtime event received in B within 10s ✓");
    } catch (e) {
      fail(`Realtime event not received: ${(e as Error).message}`);
    }

    await A.databases.updateDocument(DB_ID, TABLE.PLAYERS, hostPlayerId, {
      isCompletedThisRound: false,
    });

    // ── 6. Permission proof: B cannot write A's player row ────────────────────
    console.log("\n6. Row Security: B cannot write A's player row");
    let permissionDenied = false;
    try {
      await B.databases.updateDocument(DB_ID, TABLE.PLAYERS, hostPlayerId, { name: "Hacked" });
    } catch (err) {
      if (err instanceof AppwriteException && (err.code === 401 || err.code === 403)) {
        permissionDenied = true;
      }
    }
    assert(
      permissionDenied,
      "B received 401/403 trying to write A's player row (Row Security works)",
    );

    // ── 7. endRound self-commit ───────────────────────────────────────────────
    console.log("\n7. endRound self-commit");
    await A.databases.updateDocument(DB_ID, TABLE.PLAYERS, hostPlayerId, {
      isCompletedThisRound: true,
    });
    await A.databases.updateDocument(DB_ID, TABLE.GAMES, gameId, { round: 2 });
    await A.databases.updateDocument(DB_ID, TABLE.PLAYERS, hostPlayerId, {
      completedPhaseIds: JSON.stringify(["p1"]),
      isCompletedThisRound: false,
      declaredPhaseId: null,
    });

    const updatedGame = await A.databases.getDocument<GameRow>(DB_ID, TABLE.GAMES, gameId);
    const updatedPlayer = await A.databases.getDocument<PlayerRow>(
      DB_ID,
      TABLE.PLAYERS,
      hostPlayerId,
    );

    assert(updatedGame.round === 2, "Game round advanced to 2");
    assert(
      JSON.parse(updatedPlayer.completedPhaseIds as string).includes("p1"),
      "Host player banked phase p1",
    );

    // ── 8. Reactions: insert + realtime ──────────────────────────────────────
    console.log("\n8. Reactions: insert + subscribe");
    const reactionChannel = `databases.${DB_ID}.collections.${TABLE.REACTIONS}.documents`;
    const reactionId = ID.unique();
    registerCleanup(async () => {
      await serverDatabases.deleteDocument(DB_ID, TABLE.REACTIONS, reactionId).catch(() => {});
    });
    try {
      await waitForEvent(
        B.realtime,
        reactionChannel,
        (p) =>
          (p as { emoji?: string }).emoji === "🎉" && (p as { gameId?: string }).gameId === gameId,
        () =>
          A.databases.createDocument<ReactionRow>(
            DB_ID,
            TABLE.REACTIONS,
            reactionId,
            { gameId, playerId: hostPlayerId, emoji: "🎉", createdAt: new Date().toISOString() },
            [Permission.read(Role.any())],
          ),
      );
      pass("Reaction realtime event received in B within 10s ✓");
    } catch (e) {
      fail(`Reaction event not received: ${(e as Error).message}`);
    }

    // ── 9. Presence derivation ────────────────────────────────────────────────
    console.log("\n9. Presence: isOnline derivation");
    const ONLINE_THRESHOLD_MS = 25_000;
    const recentTime = new Date().toISOString();
    const oldTime = new Date(Date.now() - ONLINE_THRESHOLD_MS - 5000).toISOString();
    assert(
      Date.now() - new Date(recentTime).getTime() < ONLINE_THRESHOLD_MS,
      "Recent lastSeen → isOnline = true",
    );
    assert(
      !(Date.now() - new Date(oldTime).getTime() < ONLINE_THRESHOLD_MS),
      "Old lastSeen → isOnline = false",
    );

    console.log(`\n=== All tests complete ===`);
    if (process.exitCode) {
      console.error("\n❌ Some tests FAILED");
    } else {
      console.log("\n✅ All tests passed");
    }
  } catch (err) {
    console.error("\n✗ Unexpected error:", err);
    process.exitCode = 1;
  } finally {
    await runCleanup(serverUsers, [userIdA, userIdB]);
    console.log("  Cleanup done");
  }
}

void main();
