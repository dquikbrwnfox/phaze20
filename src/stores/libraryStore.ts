import { create } from "zustand"
import { databases, DB_ID, TABLE } from "@/lib/appwrite"
import { ID, Permission, Role, Query } from "appwrite"
import { BUILTIN_PHASE_SETS, BUILTIN_PHASE_MAP, RANDOM_POOL_PHASES } from "@/lib/phaseData"
import type { PhaseSet, Phase, PhaseSetRow } from "@/types"

// Combined lookup: builtin + pool phases
const ALL_PHASES_MAP = new Map<string, Phase>([
  ...BUILTIN_PHASE_MAP,
  ...RANDOM_POOL_PHASES.map((p) => [p.id, p] as [string, Phase]),
])

export function resolvePhases(ids: string[]): Phase[] {
  return ids.flatMap((id) => {
    const p = ALL_PHASES_MAP.get(id)
    return p ? [p] : []
  })
}

interface LibraryState {
  userSets: PhaseSet[]
  loading: boolean
  load: (userId: string) => Promise<void>
  create: (params: { name: string; description: string; phaseIds: string[]; userId: string }) => Promise<PhaseSet>
  remove: (id: string) => Promise<void>
}

export const useLibraryStore = create<LibraryState>((set) => ({
  userSets: [],
  loading: false,

  async load(userId) {
    set({ loading: true })
    try {
      const res = await databases.listDocuments<PhaseSetRow>(DB_ID, TABLE.PHASE_SETS, [
        Query.equal("createdBy", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(50),
      ])
      const sets: PhaseSet[] = res.documents.map(rowToSet)
      set({ userSets: sets })
    } finally {
      set({ loading: false })
    }
  },

  async create({ name, description, phaseIds, userId }) {
    const doc = await databases.createDocument<PhaseSetRow>(
      DB_ID, TABLE.PHASE_SETS, ID.unique(),
      { name, description, phaseIds: JSON.stringify(phaseIds), createdBy: userId },
      [Permission.read(Role.any()), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))],
    )
    const newSet = rowToSet(doc)
    set((s) => ({ userSets: [newSet, ...s.userSets] }))
    return newSet
  },

  async remove(id) {
    await databases.deleteDocument(DB_ID, TABLE.PHASE_SETS, id)
    set((s) => ({ userSets: s.userSets.filter((s) => s.id !== id) }))
  },
}))

function rowToSet(doc: PhaseSetRow): PhaseSet {
  let phaseIds: string[] = []
  try { phaseIds = JSON.parse(doc.phaseIds) as string[] } catch { /* empty */ }
  return { id: doc.$id, name: doc.name, description: doc.description, phaseIds, isBuiltin: false }
}

export { BUILTIN_PHASE_SETS, ALL_PHASES_MAP }
