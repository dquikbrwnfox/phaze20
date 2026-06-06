import { useNavigate, useSearchParams } from "react-router-dom"
import { useState, useEffect } from "react"
import { useTrackerStore } from "@/stores/trackerStore"
import { useAuthStore } from "@/stores/authStore"
import { useLibraryStore, resolvePhases } from "@/stores/libraryStore"
import { BUILTIN_PHASE_SETS, BUILTIN_PHASES } from "@/lib/phaseData"
import type { PlayerColor, PhaseSet } from "@/types"

const COLORS: PlayerColor[] = ["rose", "amber", "lime", "teal", "sky", "violet", "fuchsia", "orange"]

export default function SetupPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isJoin = params.get("join") === "1"

  const { createGame, joinGame, status } = useTrackerStore()
  const { userId } = useAuthStore()
  const { userSets, load } = useLibraryStore()

  const [name, setName] = useState("")
  const [color, setColor] = useState<PlayerColor>("sky")
  const [joinCode, setJoinCode] = useState("")
  const [phaseSetId, setPhaseSetId] = useState(BUILTIN_PHASE_SETS[0].id)

  useEffect(() => {
    if (userId) void load(userId)
  }, [userId, load])

  const allSets: PhaseSet[] = [...BUILTIN_PHASE_SETS, ...userSets]

  async function handleStart() {
    if (!userId) return
    if (isJoin) {
      await joinGame(joinCode.trim().toUpperCase(), name.trim(), color, userId)
      const game = useTrackerStore.getState().game
      if (game) navigate(`/game/${game.id}`)
    } else {
      const set = allSets.find((s) => s.id === phaseSetId) ?? BUILTIN_PHASE_SETS[0]
      const phases = set.isBuiltin
        ? BUILTIN_PHASES.filter((p) => set.phaseIds.includes(p.id))
        : resolvePhases(set.phaseIds)
      // Classic = ordered through all 10; Crazy Twenties / custom = free-choice
      const orderedCount = phaseSetId === "classic" ? 10 : phaseSetId === "full-20" ? 20 : 0
      const code = await createGame({ playerName: name.trim(), playerColor: color, userId, phasesSnapshot: phases, phaseSetId, orderedCount })
      const game = useTrackerStore.getState().game
      if (game) navigate(`/game/${game.id}?code=${code}`)
    }
  }

  const busy = status === "loading"

  return (
    <div className="page-root">
      <header className="page-header">
        <button className="btn-back" onClick={() => navigate("/")}>←</button>
        <h2 className="font-display font-bold text-white">{isJoin ? "Join game" : "New game"}</h2>
      </header>

      <main className="page-scroll flex flex-col gap-6 max-w-md mx-auto w-full">
        <div className="flex flex-col gap-2">
          <p className="section-heading">Your name</p>
          <input
            className="bg-card border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30"
            placeholder="Enter name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="section-heading">Your color</p>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-9 h-9 rounded-full transition-all ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110" : ""}`}
                style={{ backgroundColor: `var(--color-player-${c})` }}
              />
            ))}
          </div>
        </div>

        {isJoin ? (
          <div className="flex flex-col gap-2">
            <p className="section-heading">Game code</p>
            <input
              className="bg-card border border-white/10 rounded-xl px-4 py-3 text-white uppercase tracking-widest outline-none focus:border-white/30 text-center text-lg font-display"
              placeholder="XXXXX"
              maxLength={5}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="section-heading">Phase set</p>
              <button
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
                onClick={() => navigate("/library")}
              >
                Manage →
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {allSets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPhaseSetId(s.id)}
                  className={`card-interactive px-4 py-3 text-left transition-colors ${phaseSetId === s.id ? "border-white/30 bg-white/5" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold text-white text-sm">{s.name}</p>
                    {!s.isBuiltin && <span className="text-xs text-white/30">custom</span>}
                  </div>
                  <p className="text-muted text-xs mt-0.5">
                    {s.description || `${s.phaseIds.length} phases`}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="page-footer">
        <button
          className="setup-cta"
          disabled={busy || !name.trim() || (isJoin && !joinCode.trim())}
          onClick={() => void handleStart()}
        >
          {busy ? "Connecting…" : isJoin ? "Join game" : "Create game"}
        </button>
      </footer>
    </div>
  )
}
