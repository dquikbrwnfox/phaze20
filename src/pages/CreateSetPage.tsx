import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useLibraryStore } from "@/stores/libraryStore"
import { useAuthStore } from "@/stores/authStore"
import { BUILTIN_PHASES, RANDOM_POOL_PHASES } from "@/lib/phaseData"
import type { Phase } from "@/types"

// Combined de-duped phase list for picking
const PICKABLE: Phase[] = [
  ...BUILTIN_PHASES,
  ...RANDOM_POOL_PHASES.filter((p) => !BUILTIN_PHASES.some((b) => b.rule === p.rule && b.constraint === p.constraint)),
]

const DIFF_COLORS: Record<string, string> = {
  easy: "text-green-400",
  medium: "text-amber-400",
  hard: "text-rose-400",
}

export default function CreateSetPage() {
  const navigate = useNavigate()
  const { create } = useLibraryStore()
  const { userId } = useAuthStore()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleCreate() {
    if (!userId || !name.trim() || selected.length < 2) return
    setBusy(true)
    try {
      await create({ name: name.trim(), description: description.trim(), phaseIds: selected, userId })
      navigate("/library")
    } finally {
      setBusy(false)
    }
  }

  const canCreate = !!name.trim() && selected.length >= 2

  return (
    <div className="page-root">
      <header className="page-header">
        <button className="btn-back" onClick={() => navigate("/library")}>←</button>
        <h2 className="font-display font-bold text-white">New phase set</h2>
      </header>

      <main className="page-scroll flex flex-col gap-6 max-w-md mx-auto w-full">
        <div className="flex flex-col gap-2">
          <p className="section-heading">Name</p>
          <input
            className="bg-card border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30"
            placeholder="My custom set…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="section-heading">Description <span className="text-white/30">(optional)</span></p>
          <input
            className="bg-card border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30"
            placeholder="Short description…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="section-heading">
            Phases
            <span className="ml-2 text-white/40 font-normal">{selected.length} selected</span>
          </p>
          <div className="flex flex-col gap-1.5">
            {PICKABLE.map((phase) => {
              const on = selected.includes(phase.id)
              return (
                <button
                  key={phase.id}
                  onClick={() => toggle(phase.id)}
                  className={`card-interactive px-3 py-2.5 text-left flex items-center gap-3 transition-colors ${on ? "border-white/30 bg-white/5" : ""}`}
                >
                  <span className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${on ? "border-white bg-white text-bg-card" : "border-white/20"}`}>
                    {on && <span className="text-xs font-bold">✓</span>}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="text-white text-sm">{phase.rule}</span>
                    {phase.constraint && (
                      <span className="ml-2 text-xs text-white/40">{phase.constraint}</span>
                    )}
                  </span>
                  {phase.difficulty && (
                    <span className={`text-xs flex-shrink-0 ${DIFF_COLORS[phase.difficulty] ?? ""}`}>
                      {phase.difficulty}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </main>

      <footer className="page-footer">
        <button
          className="setup-cta"
          disabled={busy || !canCreate}
          onClick={() => void handleCreate()}
        >
          {busy ? "Saving…" : `Create set (${selected.length} phases)`}
        </button>
      </footer>
    </div>
  )
}
