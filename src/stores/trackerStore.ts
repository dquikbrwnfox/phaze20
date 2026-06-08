import { create } from "zustand";
import { ID, Query, Permission, Role } from "appwrite";
import { databases, realtime, DB_ID, TABLE } from "@/lib/appwrite";
import { rowsToGame } from "@/lib/realtimeGame";
import { detectWinners } from "@/lib/gameUtils";
import type { Game, Phase, PlayerColor, GameRow, PlayerRow, ReactionRow } from "@/types";

export type TrackerStatus = "idle" | "loading" | "active" | "error";

interface ReactionEvent {
  id: string;
  playerId: string;
  emoji: string;
  at: number;
}

interface TrackerState {
  game: Game | null;
  status: TrackerStatus;
  error: string | null;
  myPlayerId: string | null;
  recentReactions: ReactionEvent[];

  createGame: (opts: CreateGameOpts) => Promise<string>;
  joinGame: (
    code: string,
    playerName: string,
    playerColor: PlayerColor,
    userId: string,
  ) => Promise<void>;
  leaveGame: () => void;
  toggleCompletion: (playerId: string) => Promise<void>;
  declarePhase: (playerId: string, phaseId: string) => Promise<void>;
  endRound: () => Promise<void>;
  adjustPlayerPhase: (playerId: string, delta: number) => Promise<void>;
  sendReaction: (playerId: string, emoji: string) => Promise<void>;
}

interface CreateGameOpts {
  playerName: string;
  playerColor: PlayerColor;
  userId: string;
  phasesSnapshot: Phase[];
  phaseSetId: string;
  orderedCount: number;
}

let unsub: (() => void) | null = null;

function stopSubscription() {
  if (unsub) {
    unsub();
    unsub = null;
  }
}

function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export const useTrackerStore = create<TrackerState>((set, get) => ({
  game: null,
  status: "idle",
  error: null,
  myPlayerId: null,
  recentReactions: [],

  async createGame({ playerName, playerColor, userId, phasesSnapshot, phaseSetId, orderedCount }) {
    set({ status: "loading", error: null });
    try {
      const gameId = ID.unique();
      const playerId = ID.unique();
      const joinCode = generateJoinCode();

      // Create game row (host owns the game row)
      await databases.createDocument(
        DB_ID,
        TABLE.GAMES,
        gameId,
        {
          joinCode,
          status: "active",
          round: 1,
          orderedCount,
          phaseSetId,
          phasesSnapshot: JSON.stringify(phasesSnapshot),
          hostId: userId,
          createdAt: Date.now(),
        },
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ],
      );

      // Create host's player row
      await databases.createDocument(
        DB_ID,
        TABLE.PLAYERS,
        playerId,
        {
          gameId,
          name: playerName,
          color: playerColor,
          userId,
          completedPhaseIds: JSON.stringify([]),
          declaredPhaseId: null,
          isCompletedThisRound: false,
        },
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ],
      );

      set({ myPlayerId: playerId, status: "active" });
      await subscribeToGame(gameId, set, get);
      return joinCode;
    } catch (err) {
      set({ status: "error", error: String(err) });
      throw err;
    }
  },

  async joinGame(code, playerName, playerColor, userId) {
    set({ status: "loading", error: null });
    try {
      const gameRows = await databases.listDocuments<GameRow>(DB_ID, TABLE.GAMES, [
        Query.equal("joinCode", code),
        Query.equal("status", "active"),
      ]);

      if (!gameRows.documents.length) throw new Error("Game not found or already finished");
      const gameRow = gameRows.documents[0];
      const gameId = gameRow.$id;

      const playerId = ID.unique();
      await databases.createDocument(
        DB_ID,
        TABLE.PLAYERS,
        playerId,
        {
          gameId,
          name: playerName,
          color: playerColor,
          userId,
          completedPhaseIds: JSON.stringify([]),
          declaredPhaseId: null,
          isCompletedThisRound: false,
        },
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(userId)),
          Permission.update(Role.user(gameRow.hostId)),
          Permission.delete(Role.user(userId)),
        ],
      );

      set({ myPlayerId: playerId, status: "active" });
      await subscribeToGame(gameId, set, get);
    } catch (err) {
      set({ status: "error", error: String(err) });
      throw err;
    }
  },

  leaveGame() {
    stopSubscription();
    set({ game: null, status: "idle", myPlayerId: null, recentReactions: [], error: null });
  },

  async toggleCompletion(playerId) {
    const { game } = get();
    if (!game) return;
    const player = game.players.find((p) => p.id === playerId);
    if (!player) return;

    // Optimistic
    const next = !player.isCompletedThisRound;
    patchPlayer(set, get, playerId, { isCompletedThisRound: next });

    await databases.updateDocument(DB_ID, TABLE.PLAYERS, playerId, {
      isCompletedThisRound: next,
    });
  },

  async declarePhase(playerId, phaseId) {
    const { game } = get();
    if (!game) return;
    patchPlayer(set, get, playerId, { declaredPhaseId: phaseId });
    await databases.updateDocument(DB_ID, TABLE.PLAYERS, playerId, { declaredPhaseId: phaseId });
  },

  async endRound() {
    const { game } = get();
    if (!game) return;

    const winners = detectWinners(game);

    // Advance round (host writes game row)
    await databases.updateDocument(DB_ID, TABLE.GAMES, game.id, {
      round: game.round + 1,
      status: winners.length > 0 ? "finished" : "active",
      finishedAt: winners.length > 0 ? Date.now() : null,
      winnerPlayerId: winners[0] ?? null,
    });

    // Each player banks their own completed phase and resets round flag
    await Promise.all(
      game.players.map(async (player) => {
        if (!player.isCompletedThisRound) {
          // Didn't complete — just reset the flag
          await databases.updateDocument(DB_ID, TABLE.PLAYERS, player.id, {
            isCompletedThisRound: false,
          });
          return;
        }
        const { currentPhase } = resolveCurrentPhase(player, game);
        if (!currentPhase) return;
        const newCompleted = [...player.completedPhaseIds, currentPhase.id];
        await databases.updateDocument(DB_ID, TABLE.PLAYERS, player.id, {
          completedPhaseIds: JSON.stringify(newCompleted),
          isCompletedThisRound: false,
          declaredPhaseId: null,
        });
      }),
    );
  },

  async adjustPlayerPhase(playerId, delta) {
    const { game } = get();
    if (!game) return;
    const player = game.players.find((p) => p.id === playerId);
    if (!player) return;
    const { phasesSnapshot } = game;
    let ids = [...player.completedPhaseIds];
    if (delta > 0) {
      const next = phasesSnapshot[ids.length];
      if (next) ids.push(next.id);
    } else {
      ids = ids.slice(0, Math.max(0, ids.length - 1));
    }
    patchPlayer(set, get, playerId, { completedPhaseIds: ids });
    await databases.updateDocument(DB_ID, TABLE.PLAYERS, playerId, {
      completedPhaseIds: JSON.stringify(ids),
    });
  },

  async sendReaction(playerId, emoji) {
    const { game } = get();
    if (!game) return;
    await databases.createDocument(
      DB_ID,
      TABLE.REACTIONS,
      ID.unique(),
      {
        gameId: game.id,
        playerId,
        emoji,
        createdAt: new Date().toISOString(),
      },
      [Permission.read(Role.any())],
    );
  },
}));

// ─── Subscription helpers ─────────────────────────────────────────────────────

async function subscribeToGame(
  gameId: string,
  set: (partial: Partial<TrackerState>) => void,
  get: () => TrackerState,
) {
  // Initial load
  const [gameDoc, playerDocs] = await Promise.all([
    databases.getDocument<GameRow>(DB_ID, TABLE.GAMES, gameId),
    databases.listDocuments<PlayerRow>(DB_ID, TABLE.PLAYERS, [Query.equal("gameId", gameId)]),
  ]);
  set({ game: rowsToGame(gameDoc, playerDocs.documents) });

  stopSubscription();
  const channels = [
    `databases.${DB_ID}.collections.${TABLE.GAMES}.documents.${gameId}`,
    `databases.${DB_ID}.collections.${TABLE.PLAYERS}.documents`,
    `databases.${DB_ID}.collections.${TABLE.REACTIONS}.documents`,
  ];

  // SDK v21: subscribe returns a promise resolving to a subscription with .close()
  const sub = await realtime.subscribe(channels, async (response) => {
    const evts = response.events as string[];
    const isGameEvt = evts.some((e) => e.includes(`.${TABLE.GAMES}.`));
    const isPlayerEvt = evts.some((e) => e.includes(`.${TABLE.PLAYERS}.`));
    const isReactionEvt = evts.some(
      (e) => e.includes(`.${TABLE.REACTIONS}.`) && e.endsWith(".create"),
    );

    if (isGameEvt || isPlayerEvt) {
      const [gd, pd] = await Promise.all([
        databases.getDocument<GameRow>(DB_ID, TABLE.GAMES, gameId),
        databases.listDocuments<PlayerRow>(DB_ID, TABLE.PLAYERS, [Query.equal("gameId", gameId)]),
      ]);
      set({ game: rowsToGame(gd, pd.documents) });
    }

    if (isReactionEvt) {
      const row = response.payload as ReactionRow;
      if (row.gameId !== gameId) return;
      const reaction: ReactionEvent = {
        id: row.$id,
        playerId: row.playerId,
        emoji: row.emoji,
        at: Date.now(),
      };
      set({ recentReactions: [...get().recentReactions.slice(-9), reaction] });
      setTimeout(() => {
        const current = get().recentReactions.filter((r) => r.id !== reaction.id);
        set({ recentReactions: current });
      }, 4000);
    }
  });

  unsub = () => {
    (sub as { close?: () => void }).close?.();
  };
}

// ─── Local helpers ────────────────────────────────────────────────────────────

function patchPlayer(
  set: (partial: Partial<TrackerState>) => void,
  get: () => TrackerState,
  playerId: string,
  patch: Partial<import("@/types").Player>,
) {
  const { game } = get();
  if (!game) return;
  set({
    game: {
      ...game,
      players: game.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)),
    },
  });
}

function resolveCurrentPhase(
  player: import("@/types").Player,
  game: Game,
): { currentPhase: Phase | null } {
  const { phasesSnapshot, orderedCount } = game;
  const completedCount = player.completedPhaseIds.length;
  const isInOrdered = completedCount < orderedCount;
  const currentPhase = isInOrdered
    ? (phasesSnapshot[completedCount] ?? null)
    : player.declaredPhaseId
      ? (phasesSnapshot.find((p) => p.id === player.declaredPhaseId) ?? null)
      : null;
  return { currentPhase };
}
