import type { Game, Player, GameRow, PlayerRow } from "../types/index.js";

export function rowsToGame(gameRow: GameRow, playerRows: PlayerRow[]): Game {
  const players: Player[] = playerRows.map((r) => ({
    id: r.$id,
    name: r.name,
    color: r.color,
    userId: r.userId ?? null,
    imageUrl: r.imageUrl ?? null,
    completedPhaseIds: parseJson<string[]>(r.completedPhaseIds, []),
    declaredPhaseId: r.declaredPhaseId ?? null,
    isCompletedThisRound: r.isCompletedThisRound,
  }));

  return {
    id: gameRow.$id,
    joinCode: gameRow.joinCode,
    status: gameRow.status,
    round: gameRow.round,
    orderedCount: gameRow.orderedCount,
    phaseSetId: gameRow.phaseSetId,
    phasesSnapshot: parseJson(gameRow.phasesSnapshot, []),
    players,
    createdAt: gameRow.createdAt,
    finishedAt: gameRow.finishedAt ?? null,
    hostUserId: gameRow.hostId,
  };
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
