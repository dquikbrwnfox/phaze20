import type { Game, Player, PlayerGameView } from "@/types";

export function computePlayerGameView(player: Player, game: Game): PlayerGameView {
  const { phasesSnapshot, orderedCount } = game;
  const totalCount = phasesSnapshot.length;
  const completedCount = player.completedPhaseIds.length;
  const isWinner = completedCount >= totalCount;

  const isInOrderedSection = completedCount < orderedCount;
  const freeChoicePhases = phasesSnapshot.slice(orderedCount);

  // Current phase: ordered section → next in sequence; free-choice → declared phase
  let currentPhase = null;
  if (!isWinner) {
    if (isInOrderedSection) {
      currentPhase = phasesSnapshot[completedCount] ?? null;
    } else {
      currentPhase = player.declaredPhaseId
        ? (phasesSnapshot.find((p) => p.id === player.declaredPhaseId) ?? null)
        : null;
    }
  }

  const canMarkComplete = !isWinner && (
    isInOrderedSection ? true : player.declaredPhaseId !== null
  );

  return {
    player,
    currentPhase,
    isWinner,
    completedCount,
    totalCount,
    canMarkComplete,
    isInOrderedSection,
    freeChoicePhases,
  };
}

export function detectWinners(game: Game): string[] {
  return game.players
    .filter((p) => p.completedPhaseIds.length >= game.phasesSnapshot.length)
    .map((p) => p.id);
}
