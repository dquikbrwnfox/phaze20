export type PhaseConstraint = "no-wilds" | "alternating-colors" | null;
export type PhaseDifficulty = "easy" | "medium" | "hard";

export interface Phase {
  id: string;
  number: number;
  rule: string;
  constraint: PhaseConstraint;
  isBuiltin: boolean;
  difficulty?: PhaseDifficulty;
}

export interface PhaseSet {
  id: string;
  name: string;
  description: string;
  phaseIds: string[];
  isBuiltin: boolean;
}

export type GameMode = "ordered" | "free-choice";

export type PlayerColor =
  | "rose"
  | "amber"
  | "lime"
  | "teal"
  | "sky"
  | "violet"
  | "fuchsia"
  | "orange";

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  /** Appwrite user id. Null for anonymous players. */
  userId?: string | null;
  imageUrl?: string | null;
  completedPhaseIds: string[];
  declaredPhaseId: string | null;
  isCompletedThisRound: boolean;
}

export interface Game {
  id: string;
  status: "active" | "finished";
  orderedCount: number;
  phaseSetId: string;
  phasesSnapshot: Phase[];
  players: Player[];
  round: number;
  createdAt: number;
  finishedAt: number | null;
  hostUserId?: string | null;
  joinCode: string;
}

/** Ephemeral per-player presence state. */
export interface PresenceState {
  isOnline: boolean;
  isThinking: boolean;
}

export interface PlayerGameView {
  player: Player;
  currentPhase: Phase | null;
  isWinner: boolean;
  completedCount: number;
  totalCount: number;
  canMarkComplete: boolean;
  isInOrderedSection: boolean;
  freeChoicePhases: Phase[];
}

// ─── Appwrite row shapes (what lands in TablesDB) ─────────────────────────────
// These must satisfy `extends Models.Document` (has $id, $collectionId, etc.)

import type { Models } from "appwrite";

export type GameRow = Models.Document & {
  joinCode: string;
  status: "active" | "finished";
  round: number;
  orderedCount: number;
  phaseSetId: string;
  phasesSnapshot: string; // JSON
  hostId: string;
  winnerPlayerId?: string | null;
  createdAt: number;
  finishedAt?: number | null;
};

export type PlayerRow = Models.Document & {
  gameId: string;
  name: string;
  color: PlayerColor;
  userId?: string | null;
  imageUrl?: string | null;
  completedPhaseIds: string; // JSON
  declaredPhaseId?: string | null;
  isCompletedThisRound: boolean;
};

export type PresenceRow = Models.Document & {
  gameId: string;
  playerId: string;
  lastSeen: string; // ISO datetime
  isThinking: boolean;
};

export type ReactionRow = Models.Document & {
  gameId: string;
  playerId: string;
  emoji: string;
  createdAt: string; // ISO datetime
};

export type PhaseSetRow = Models.Document & {
  name: string;
  description: string;
  phaseIds: string; // JSON array of phase IDs
  createdBy: string;
};
