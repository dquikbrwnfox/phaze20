import { describe, it, expect } from "vitest";
import { computePlayerGameView, detectWinners } from "@/lib/gameUtils";
import { calculateDifficulty, BUILTIN_PHASES, BUILTIN_PHASE_SETS } from "@/lib/phaseData";
import { rowsToGame } from "@/lib/realtimeGame";
import type { Game, Player, Phase, GameRow, PlayerRow } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePhase(n: number): Phase {
  return { id: `p${n}`, number: n, rule: "2 sets of 3", constraint: null, isBuiltin: true };
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "player-1",
    name: "Alice",
    color: "sky",
    completedPhaseIds: [],
    declaredPhaseId: null,
    isCompletedThisRound: false,
    ...overrides,
  };
}

function makeGame(players: Player[], phases = [makePhase(1), makePhase(2), makePhase(3)]): Game {
  return {
    id: "game-1",
    joinCode: "AAAAA",
    status: "active",
    round: 1,
    orderedCount: 3,
    phaseSetId: "classic",
    phasesSnapshot: phases,
    players,
    createdAt: Date.now(),
    finishedAt: null,
  };
}

// ── computePlayerGameView ─────────────────────────────────────────────────────

describe("computePlayerGameView", () => {
  it("ordered section: first phase when no completions", () => {
    const phases = [makePhase(1), makePhase(2)];
    const player = makePlayer();
    const game = makeGame([player], phases);
    const view = computePlayerGameView(player, game);
    expect(view.currentPhase?.id).toBe("p1");
    expect(view.isInOrderedSection).toBe(true);
    expect(view.canMarkComplete).toBe(true);
    expect(view.completedCount).toBe(0);
    expect(view.isWinner).toBe(false);
  });

  it("advances to next ordered phase after completion", () => {
    const phases = [makePhase(1), makePhase(2)];
    const player = makePlayer({ completedPhaseIds: ["p1"] });
    const game = makeGame([player], phases);
    const view = computePlayerGameView(player, game);
    expect(view.currentPhase?.id).toBe("p2");
    expect(view.completedCount).toBe(1);
  });

  it("winner when all phases complete", () => {
    const phases = [makePhase(1), makePhase(2)];
    const player = makePlayer({ completedPhaseIds: ["p1", "p2"] });
    const game = makeGame([player], phases);
    const view = computePlayerGameView(player, game);
    expect(view.isWinner).toBe(true);
    expect(view.currentPhase).toBe(null);
    expect(view.canMarkComplete).toBe(false);
  });

  it("free-choice: needs declared phase to canMarkComplete", () => {
    const phases = [makePhase(1), makePhase(2), makePhase(3)];
    // orderedCount = 1, player completed p1 → in free-choice section
    const player = makePlayer({ completedPhaseIds: ["p1"], declaredPhaseId: null });
    const game = { ...makeGame([player], phases), orderedCount: 1 };
    const view = computePlayerGameView(player, game);
    expect(view.isInOrderedSection).toBe(false);
    expect(view.canMarkComplete).toBe(false); // no declared phase
    expect(view.freeChoicePhases).toHaveLength(2);
  });

  it("free-choice: can complete when phase declared", () => {
    const phases = [makePhase(1), makePhase(2), makePhase(3)];
    const player = makePlayer({ completedPhaseIds: ["p1"], declaredPhaseId: "p2" });
    const game = { ...makeGame([player], phases), orderedCount: 1 };
    const view = computePlayerGameView(player, game);
    expect(view.canMarkComplete).toBe(true);
    expect(view.currentPhase?.id).toBe("p2");
  });
});

// ── detectWinners ─────────────────────────────────────────────────────────────

describe("detectWinners", () => {
  it("no winners when no one complete", () => {
    const players = [makePlayer({ id: "a" }), makePlayer({ id: "b" })];
    expect(detectWinners(makeGame(players))).toHaveLength(0);
  });

  it("detects single winner", () => {
    const phases = [makePhase(1), makePhase(2)];
    const winner = makePlayer({ id: "a", completedPhaseIds: ["p1", "p2"] });
    const loser = makePlayer({ id: "b", completedPhaseIds: ["p1"] });
    const game = makeGame([winner, loser], phases);
    expect(detectWinners(game)).toEqual(["a"]);
  });

  it("detects multiple simultaneous winners", () => {
    const phases = [makePhase(1)];
    const p1 = makePlayer({ id: "a", completedPhaseIds: ["p1"] });
    const p2 = makePlayer({ id: "b", completedPhaseIds: ["p1"] });
    const game = makeGame([p1, p2], phases);
    expect(detectWinners(game)).toEqual(["a", "b"]);
  });
});

// ── calculateDifficulty ───────────────────────────────────────────────────────

describe("calculateDifficulty", () => {
  it("2 sets of 3 = easy", () => {
    expect(calculateDifficulty("2 sets of 3", null)).toBe("easy");
  });

  it("1 run of 7 = medium", () => {
    expect(calculateDifficulty("1 run of 7", null)).toBe("medium");
  });

  it("1 run of 9 with no-wilds = medium", () => {
    expect(calculateDifficulty("1 run of 9", "no-wilds")).toBe("medium");
  });

  it("all builtin phases have a difficulty", () => {
    for (const phase of BUILTIN_PHASES) {
      expect(phase.difficulty).toBeDefined();
      expect(["easy", "medium", "hard"]).toContain(phase.difficulty);
    }
  });
});

// ── BUILTIN_PHASE_SETS ────────────────────────────────────────────────────────

describe("BUILTIN_PHASE_SETS", () => {
  it("classic has exactly 10 phases", () => {
    const classic = BUILTIN_PHASE_SETS.find((s) => s.id === "classic")!;
    expect(classic.phaseIds).toHaveLength(10);
  });

  it("crazy-twenties has exactly 10 phases", () => {
    const crazy = BUILTIN_PHASE_SETS.find((s) => s.id === "crazy-twenties")!;
    expect(crazy.phaseIds).toHaveLength(10);
  });

  it("full-20 has 20 phases", () => {
    const full = BUILTIN_PHASE_SETS.find((s) => s.id === "full-20")!;
    expect(full.phaseIds).toHaveLength(20);
  });
});

// ── rowsToGame adapter ────────────────────────────────────────────────────────

describe("rowsToGame", () => {
  const phases = [makePhase(1), makePhase(2)];

  const gameRow = {
    $id: "g1",
    $collectionId: "games",
    $databaseId: "phaze20",
    $createdAt: "",
    $updatedAt: "",
    $permissions: [],
    $sequence: 0,
    joinCode: "HELLO",
    status: "active" as const,
    round: 3,
    orderedCount: 2,
    phaseSetId: "classic",
    phasesSnapshot: JSON.stringify(phases),
    hostId: "user-1",
    createdAt: 12345,
  } satisfies GameRow;

  const playerRow = {
    $id: "pl1",
    $collectionId: "players",
    $databaseId: "phaze20",
    $createdAt: "",
    $updatedAt: "",
    $permissions: [],
    $sequence: 0,
    gameId: "g1",
    name: "Alice",
    color: "sky" as const,
    completedPhaseIds: JSON.stringify(["p1"]),
    declaredPhaseId: null,
    isCompletedThisRound: false,
  } satisfies PlayerRow;

  it("reconstructs Game in memory correctly", () => {
    const game = rowsToGame(gameRow, [playerRow]);
    expect(game.id).toBe("g1");
    expect(game.joinCode).toBe("HELLO");
    expect(game.round).toBe(3);
    expect(game.phasesSnapshot).toHaveLength(2);
    expect(game.players).toHaveLength(1);
    expect(game.players[0].completedPhaseIds).toEqual(["p1"]);
    expect(game.players[0].name).toBe("Alice");
  });

  it("handles empty completedPhaseIds JSON", () => {
    const row = { ...playerRow, completedPhaseIds: "[]" };
    const game = rowsToGame(gameRow, [row]);
    expect(game.players[0].completedPhaseIds).toEqual([]);
  });

  it("falls back gracefully on malformed JSON", () => {
    const row = { ...playerRow, completedPhaseIds: "not-json" };
    const game = rowsToGame(gameRow, [row]);
    expect(game.players[0].completedPhaseIds).toEqual([]);
  });
});

// ── endRound self-commit math ─────────────────────────────────────────────────

describe("endRound phase banking logic", () => {
  it("banked phase id is current phase id for ordered player", () => {
    const phases = [makePhase(1), makePhase(2), makePhase(3)];
    const player = makePlayer({ completedPhaseIds: ["p1"] }); // on phase 2
    const game = { ...makeGame([player], phases), orderedCount: 3 };
    const { currentPhaseId } = resolveCurrentPhaseId(player, game);
    expect(currentPhaseId).toBe("p2");
  });

  it("banked phase id is declared phase for free-choice player", () => {
    const phases = [makePhase(1), makePhase(2), makePhase(3)];
    const player = makePlayer({ completedPhaseIds: ["p1"], declaredPhaseId: "p3" });
    const game = { ...makeGame([player], phases), orderedCount: 1 };
    const { currentPhaseId } = resolveCurrentPhaseId(player, game);
    expect(currentPhaseId).toBe("p3");
  });

  it("no bank when player has no phase to complete", () => {
    const phases = [makePhase(1), makePhase(2)];
    const player = makePlayer({ completedPhaseIds: [], declaredPhaseId: null });
    const game = { ...makeGame([player], phases), orderedCount: 0 };
    const { currentPhaseId } = resolveCurrentPhaseId(player, game);
    expect(currentPhaseId).toBe(null);
  });
});

function resolveCurrentPhaseId(player: Player, game: Game): { currentPhaseId: string | null } {
  const { phasesSnapshot, orderedCount } = game;
  const completedCount = player.completedPhaseIds.length;
  const isInOrdered = completedCount < orderedCount;
  const currentPhase = isInOrdered
    ? (phasesSnapshot[completedCount] ?? null)
    : (player.declaredPhaseId
      ? phasesSnapshot.find((p) => p.id === player.declaredPhaseId) ?? null
      : null);
  return { currentPhaseId: currentPhase?.id ?? null };
}
