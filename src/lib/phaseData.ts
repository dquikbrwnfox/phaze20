import type { Phase, PhaseSet, PhaseConstraint } from "@/types";
// Re-use Phase type for the random pool (avoids inline import() annotation)
type PoolPhase = Phase;

export function calculateDifficulty(
  rule: string,
  constraint: PhaseConstraint,
): "easy" | "medium" | "hard" {
  let score = 0;

  // Parse runs: "1 run of 5", "2 runs of 3"
  const runMatches = rule.match(/(\d+)\s*runs?\s*of\s*(\d+)/gi) || [];
  const runs: number[] = [];
  runMatches.forEach((m) => {
    const match = m.match(/(\d+)\s*(?:runs?\s+)?of\s*(\d+)/i);
    if (match) {
      const count = parseInt(match[1]);
      const length = parseInt(match[2]);
      for (let i = 0; i < count; i++) runs.push(length);
    }
  });

  // Parse sets: "2 sets of 4", "1 set of 8"
  const setMatches = rule.match(/(\d+)\s*sets?\s*of\s*(\d+)/gi) || [];
  const sets: number[] = [];
  setMatches.forEach((m) => {
    const match = m.match(/(\d+)\s*(?:sets?\s+)?of\s*(\d+)/i);
    if (match) {
      const count = parseInt(match[1]);
      const size = parseInt(match[2]);
      for (let i = 0; i < count; i++) sets.push(size);
    }
  });

  // Score runs (consecutive sequences are harder than sets)
  runs.forEach((length) => {
    if (length <= 4) score += 1.5;
    else if (length <= 6) score += 3;
    else if (length <= 8) score += 4;
    else if (length <= 10) score += 5;
    else score += 6;
  });

  // Score sets (flexibility makes them easier than runs)
  sets.forEach((size) => {
    if (size <= 4) score += 0.75;
    else if (size <= 6) score += 1.5;
    else if (size <= 8) score += 2;
    else score += 2.5;
  });

  // Multiple runs increase complexity
  if (runs.length > 1) score += 1;

  // Sets are easier to combine than runs
  if (sets.length > 1) score += 0.5;

  // Mixed runs + sets is harder
  if (runs.length > 0 && sets.length > 0) score += 1;

  // Constraint penalties
  if (constraint === "no-wilds") score += 1;
  else if (constraint === "alternating-colors") score += 1.5;

  // Classify by threshold
  if (score < 4) return "easy";
  if (score < 7.5) return "medium";
  return "hard";
}

export const BUILTIN_PHASES: Phase[] = [
  {
    id: "builtin-1",
    number: 1,
    rule: "2 sets of 3",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("2 sets of 3", null),
  },
  {
    id: "builtin-2",
    number: 2,
    rule: "1 set of 3 + 1 run of 4",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("1 set of 3 + 1 run of 4", null),
  },
  {
    id: "builtin-3",
    number: 3,
    rule: "1 set of 4 + 1 run of 4",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("1 set of 4 + 1 run of 4", null),
  },
  {
    id: "builtin-4",
    number: 4,
    rule: "1 run of 7",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("1 run of 7", null),
  },
  {
    id: "builtin-5",
    number: 5,
    rule: "1 run of 8",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("1 run of 8", null),
  },
  {
    id: "builtin-6",
    number: 6,
    rule: "1 run of 9",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("1 run of 9", null),
  },
  {
    id: "builtin-7",
    number: 7,
    rule: "2 sets of 4",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("2 sets of 4", null),
  },
  {
    id: "builtin-8",
    number: 8,
    rule: "7 cards of one color",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("7 cards of one color", null),
  },
  {
    id: "builtin-9",
    number: 9,
    rule: "1 set of 5 + 1 set of 2",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("1 set of 5 + 1 set of 2", null),
  },
  {
    id: "builtin-10",
    number: 10,
    rule: "1 set of 5 + 1 set of 3",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("1 set of 5 + 1 set of 3", null),
  },
  {
    id: "builtin-11",
    number: 11,
    rule: "3 sets of 3",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("3 sets of 3", null),
  },
  {
    id: "builtin-12",
    number: 12,
    rule: "4 sets of 2",
    constraint: "no-wilds",
    isBuiltin: true,
    difficulty: calculateDifficulty("4 sets of 2", "no-wilds"),
  },
  {
    id: "builtin-13",
    number: 13,
    rule: "1 run of 5 + 1 set of 5",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("1 run of 5 + 1 set of 5", null),
  },
  {
    id: "builtin-14",
    number: 14,
    rule: "8 of one color",
    constraint: "no-wilds",
    isBuiltin: true,
    difficulty: calculateDifficulty("8 of one color", "no-wilds"),
  },
  {
    id: "builtin-15",
    number: 15,
    rule: "1 run of 10",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("1 run of 10", null),
  },
  {
    id: "builtin-16",
    number: 16,
    rule: "1 set of 7 + 1 set of 2",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("1 set of 7 + 1 set of 2", null),
  },
  {
    id: "builtin-17",
    number: 17,
    rule: "2 runs of 4",
    constraint: "no-wilds",
    isBuiltin: true,
    difficulty: calculateDifficulty("2 runs of 4", "no-wilds"),
  },
  {
    id: "builtin-18",
    number: 18,
    rule: "3 sets of 3 using 3 colors",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("3 sets of 3 using 3 colors", null),
  },
  {
    id: "builtin-19",
    number: 19,
    rule: "5 sets of 2 in same color",
    constraint: null,
    isBuiltin: true,
    difficulty: calculateDifficulty("5 sets of 2 in same color", null),
  },
  {
    id: "builtin-20",
    number: 20,
    rule: "Run of 9 in 2 alternating colors",
    constraint: "alternating-colors",
    isBuiltin: true,
    difficulty: calculateDifficulty("Run of 9 in 2 alternating colors", "alternating-colors"),
  },
];

export const BUILTIN_PHASE_SETS: PhaseSet[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Phases 1–10 in order",
    phaseIds: BUILTIN_PHASES.slice(0, 10).map((p) => p.id),
    isBuiltin: true,
  },
  {
    id: "crazy-twenties",
    name: "Crazy Twenties",
    description: "Phases 11–20 in any order",
    phaseIds: BUILTIN_PHASES.slice(10, 20).map((p) => p.id),
    isBuiltin: true,
  },
  {
    id: "full-20",
    name: "Full 20",
    description: "All 20 phases — classic first, then Crazy Twenties",
    phaseIds: BUILTIN_PHASES.map((p) => p.id),
    isBuiltin: true,
  },
];

export const BUILTIN_PHASE_MAP = new Map(BUILTIN_PHASES.map((p) => [p.id, p]));

/**
 * Community randomizer pool — 51 deduplicated phases with difficulty tags.
 * Used by the "Random" phase set on the setup screen.
 */
export const RANDOM_POOL_PHASES: PoolPhase[] = [
  // ── Easy ─────────────────────────────────────────────────────────────────
  {
    id: "pool-1",
    number: 1,
    rule: "2 sets of 3",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("2 sets of 3", null),
  },
  {
    id: "pool-2",
    number: 2,
    rule: "1 set of 3 + 1 run of 4",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 set of 3 + 1 run of 4", null),
  },
  {
    id: "pool-3",
    number: 3,
    rule: "1 set of 4 + 1 run of 4",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 set of 4 + 1 run of 4", null),
  },
  {
    id: "pool-4",
    number: 4,
    rule: "2 sets of 4",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("2 sets of 4", null),
  },
  {
    id: "pool-5",
    number: 5,
    rule: "1 set of 5",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 set of 5", null),
  },
  {
    id: "pool-6",
    number: 6,
    rule: "1 set of 4 + 1 set of 2",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 set of 4 + 1 set of 2", null),
  },
  {
    id: "pool-7",
    number: 7,
    rule: "2 runs of 4",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("2 runs of 4", null),
  },
  {
    id: "pool-8",
    number: 8,
    rule: "1 set of 5 + 1 run of 4",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 set of 5 + 1 run of 4", null),
  },
  {
    id: "pool-9",
    number: 9,
    rule: "1 set of 2 + 2 sets of 3",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 set of 2 + 2 sets of 3", null),
  },
  {
    id: "pool-10",
    number: 10,
    rule: "3 sets of 2 + 1 set of 3",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("3 sets of 2 + 1 set of 3", null),
  },
  {
    id: "pool-11",
    number: 11,
    rule: "1 run of 3 + 2 sets of 3",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 run of 3 + 2 sets of 3", null),
  },
  {
    id: "pool-12",
    number: 12,
    rule: "1 run of 3 + 3 sets of 2",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 run of 3 + 3 sets of 2", null),
  },
  {
    id: "pool-13",
    number: 13,
    rule: "1 set of 2 + 1 set of 3 + 1 set of 4",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 set of 2 + 1 set of 3 + 1 set of 4", null),
  },
  {
    id: "pool-14",
    number: 14,
    rule: "1 run of 3 + 1 set of 4 + 1 set of 3",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 run of 3 + 1 set of 4 + 1 set of 3", null),
  },
  {
    id: "pool-15",
    number: 15,
    rule: "1 run of 5 + 1 set of 3 + 1 set of 2",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 run of 5 + 1 set of 3 + 1 set of 2", null),
  },
  // ── Medium ───────────────────────────────────────────────────────────────
  {
    id: "pool-16",
    number: 16,
    rule: "1 run of 7",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 run of 7", null),
  },
  {
    id: "pool-17",
    number: 17,
    rule: "1 run of 8",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 run of 8", null),
  },
  {
    id: "pool-18",
    number: 18,
    rule: "1 run of 6 + 1 set of 2",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 run of 6 + 1 set of 2", null),
  },
  {
    id: "pool-19",
    number: 19,
    rule: "1 set of 3 + 1 run of 6",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 set of 3 + 1 run of 6", null),
  },
  {
    id: "pool-20",
    number: 20,
    rule: "1 set of 4 + 1 run of 6",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 set of 4 + 1 run of 6", null),
  },
  {
    id: "pool-21",
    number: 21,
    rule: "1 run of 6 + 2 sets of 2",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 run of 6 + 2 sets of 2", null),
  },
  {
    id: "pool-22",
    number: 22,
    rule: "1 run of 8 + 1 set of 2",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 run of 8 + 1 set of 2", null),
  },
  {
    id: "pool-23",
    number: 23,
    rule: "7 cards of one color",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("7 cards of one color", null),
  },
  {
    id: "pool-24",
    number: 24,
    rule: "8 cards of one color",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("8 cards of one color", null),
  },
  {
    id: "pool-25",
    number: 25,
    rule: "6 cards of one color",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("6 cards of one color", null),
  },
  {
    id: "pool-26",
    number: 26,
    rule: "3 cards of one color + 1 set of 4",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("3 cards of one color + 1 set of 4", null),
  },
  {
    id: "pool-27",
    number: 27,
    rule: "4 cards of one color + 1 set of 5",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("4 cards of one color + 1 set of 5", null),
  },
  {
    id: "pool-28",
    number: 28,
    rule: "6 cards of even or odd",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("6 cards of even or odd", null),
  },
  {
    id: "pool-29",
    number: 29,
    rule: "1 set of 3 + 1 run of 5",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 set of 3 + 1 run of 5", null),
  },
  {
    id: "pool-30",
    number: 30,
    rule: "1 color run of 3 + 2 sets of 2",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 color run of 3 + 2 sets of 2", null),
  },
  {
    id: "pool-31",
    number: 31,
    rule: "1 color run of 3 + 1 set of 3",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 color run of 3 + 1 set of 3", null),
  },
  {
    id: "pool-32",
    number: 32,
    rule: "1 color run of 4",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 color run of 4", null),
  },
  {
    id: "pool-33",
    number: 33,
    rule: "1 color run of 3 + 3 of one color",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 color run of 3 + 3 of one color", null),
  },
  {
    id: "pool-34",
    number: 34,
    rule: "1 color run of 4 + 1 set of 4",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 color run of 4 + 1 set of 4", null),
  },
  {
    id: "pool-35",
    number: 35,
    rule: "1 color run of 4 + 3 sets of 2",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 color run of 4 + 3 sets of 2", null),
  },
  // ── Hard ─────────────────────────────────────────────────────────────────
  {
    id: "pool-36",
    number: 36,
    rule: "1 run of 9",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 run of 9", null),
  },
  {
    id: "pool-37",
    number: 37,
    rule: "9 cards of one color",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("9 cards of one color", null),
  },
  {
    id: "pool-38",
    number: 38,
    rule: "4 cards of one color + 5 of one color",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("4 cards of one color + 5 of one color", null),
  },
  {
    id: "pool-39",
    number: 39,
    rule: "3 of one color + 3 of one color + 4 of one color",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("3 of one color + 3 of one color + 4 of one color", null),
  },
  {
    id: "pool-40",
    number: 40,
    rule: "4 of one color + 6 of one color",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("4 of one color + 6 of one color", null),
  },
  {
    id: "pool-41",
    number: 41,
    rule: "5 of one color + 5 of one color",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("5 of one color + 5 of one color", null),
  },
  {
    id: "pool-42",
    number: 42,
    rule: "1 even or odd of 8",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 even or odd of 8", null),
  },
  {
    id: "pool-43",
    number: 43,
    rule: "1 even or odd of 9",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 even or odd of 9", null),
  },
  {
    id: "pool-44",
    number: 44,
    rule: "1 even or odd of 10",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 even or odd of 10", null),
  },
  {
    id: "pool-45",
    number: 45,
    rule: "1 run of 10",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 run of 10", null),
  },
  {
    id: "pool-46",
    number: 46,
    rule: "1 color run of 5",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 color run of 5", null),
  },
  {
    id: "pool-47",
    number: 47,
    rule: "1 color run of 5 + 2 sets of 2",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 color run of 5 + 2 sets of 2", null),
  },
  {
    id: "pool-48",
    number: 48,
    rule: "1 color run of 6 + 1 set of 2",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 color run of 6 + 1 set of 2", null),
  },
  {
    id: "pool-49",
    number: 49,
    rule: "1 color even or odd of 3 + 1 color even or odd of 4",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 color even or odd of 3 + 1 color even or odd of 4", null),
  },
  {
    id: "pool-50",
    number: 50,
    rule: "1 color even or odd of 3 + 1 color even or odd of 5",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("1 color even or odd of 3 + 1 color even or odd of 5", null),
  },
  {
    id: "pool-51",
    number: 51,
    rule: "2 color even or odd of 4",
    constraint: null,
    isBuiltin: false,
    difficulty: calculateDifficulty("2 color even or odd of 4", null),
  },
];
