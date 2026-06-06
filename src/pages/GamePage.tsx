import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { useTrackerStore } from "@/stores/trackerStore"
import { useAuthStore } from "@/stores/authStore"
import { usePresence } from "@/hooks/usePresence"
import { useReactions } from "@/hooks/useReactions"
import { computePlayerGameView } from "@/lib/gameUtils"
import type { Phase, Player, Game } from "@/types"

// ── Phase Picker Sheet ────────────────────────────────────────────────────────
function PhasePicker({
  phases,
  current,
  onPick,
  onClose,
}: {
  phases: Phase[]
  current: Phase | null
  onPick: (phaseId: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-end" onClick={onClose}>
      <div
        className="w-full max-h-[70vh] bg-[--color-bg-card] rounded-t-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-display font-bold text-white text-sm">Pick your phase</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex flex-col gap-1 p-3">
          {phases.map((phase) => {
            const active = phase.id === current?.id
            return (
              <button
                key={phase.id}
                onClick={() => { onPick(phase.id); onClose() }}
                className={`card-interactive px-3 py-2.5 text-left transition-colors ${active ? "border-white/30 bg-white/5" : ""}`}
              >
                <p className="text-white text-sm">{phase.rule}</p>
                {phase.constraint && (
                  <p className="text-white/40 text-xs mt-0.5">{phase.constraint}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Player Card ───────────────────────────────────────────────────────────────
function PlayerCard({
  player,
  isMe,
  isHost,
  presenceOnline,
  onToggle,
  onPickPhase,
  game,
}: {
  player: Player
  isMe: boolean
  isHost: boolean
  presenceOnline: boolean
  onToggle: () => void
  onPickPhase: () => void
  game: Game
}) {
  const view = computePlayerGameView(player, game)
  const canPickPhase = isMe && !view.isWinner && !view.isInOrderedSection && view.freeChoicePhases.length > 0

  return (
    <div className={`card p-4 flex items-center gap-3 transition-all ${isMe ? "ring-1 ring-white/20" : ""}`}>
      {/* Avatar + presence dot */}
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm text-white"
          style={{ backgroundColor: `var(--color-player-${player.color})` }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[--color-bg-card] transition-colors ${presenceOnline ? "bg-green-400" : "bg-white/20"}`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-display font-semibold text-white text-sm truncate">{player.name}</p>
          {view.isWinner && (
            <span className="text-xs bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full">Winner!</span>
          )}
          {player.isCompletedThisRound && !view.isWinner && (
            <span className="text-xs bg-green-400/20 text-green-300 px-1.5 py-0.5 rounded-full">Done ✓</span>
          )}
        </div>

        {/* Current phase — tappable for free-choice */}
        <button
          disabled={!canPickPhase}
          onClick={onPickPhase}
          className={`text-xs mt-0.5 block text-left w-full ${canPickPhase ? "text-white/70 underline underline-offset-2 decoration-dotted hover:text-white" : "text-muted cursor-default"}`}
        >
          {view.currentPhase ? view.currentPhase.rule : "All phases complete!"}
          {canPickPhase && <span className="ml-1 text-white/30">▾</span>}
        </button>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(view.completedCount / Math.max(view.totalCount, 1)) * 100}%`,
              backgroundColor: `var(--color-player-${player.color})`,
            }}
          />
        </div>
        <p className="text-xs text-white/30 mt-1">{view.completedCount}/{view.totalCount}</p>
      </div>

      {/* Toggle completion */}
      {(isMe || isHost) && !view.isWinner && (
        <button
          onClick={onToggle}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${player.isCompletedThisRound ? "bg-green-500 border-green-500 text-white" : "border-white/20 text-white/30 hover:border-white/50"}`}
        >
          ✓
        </button>
      )}
    </div>
  )
}

// ── GamePage ──────────────────────────────────────────────────────────────────
export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const joinCode = searchParams.get("code")

  const { game, myPlayerId, status, toggleCompletion, declarePhase, endRound, leaveGame } = useTrackerStore()
  const { userId } = useAuthStore()
  const { presenceMap } = usePresence(gameId ?? null, myPlayerId)
  const { recentReactions, react, EMOJIS } = useReactions(gameId ?? null)

  const [pickerPlayerId, setPickerPlayerId] = useState<string | null>(null)

  useEffect(() => {
    if (status === "idle" && !game) navigate("/")
  }, [status, game, navigate])

  if (!game || !gameId) {
    return (
      <div className="page-root items-center justify-center">
        <p className="text-muted">
          {status === "loading" ? "Loading game…" : "Game not found."}
        </p>
      </div>
    )
  }

  const isHost = game.hostUserId === userId
  const pickerPlayer = pickerPlayerId ? game.players.find((p) => p.id === pickerPlayerId) : null
  const pickerView = pickerPlayer ? computePlayerGameView(pickerPlayer, game) : null
  const winner = game.players.find((p) => p.completedPhaseIds.length >= game.phasesSnapshot.length)

  // Latest reaction for burst
  const latestReaction = recentReactions[recentReactions.length - 1]

  return (
    <div className="page-root relative">
      <div className="aurora-bg" />

      {/* Reaction burst overlay */}
      {latestReaction && (
        <div
          key={latestReaction.id}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 pointer-events-none z-50 text-6xl select-none animate-bounce"
        >
          {latestReaction.emoji}
        </div>
      )}

      {/* Phase picker sheet */}
      {pickerPlayer && pickerView && (
        <PhasePicker
          phases={pickerView.freeChoicePhases}
          current={pickerView.currentPhase}
          onPick={(phaseId) => void declarePhase(pickerPlayer.id, phaseId)}
          onClose={() => setPickerPlayerId(null)}
        />
      )}

      <header className="page-header relative z-10">
        <button className="btn-back" onClick={() => { leaveGame(); navigate("/") }}>←</button>
        <div className="flex-1">
          <h2 className="font-display font-bold text-white">Round {game.round}</h2>
          {joinCode && (
            <p className="text-xs text-muted">
              Code: <span className="text-white font-mono tracking-widest">{joinCode}</span>
            </p>
          )}
        </div>
        <span className="text-xs text-muted bg-white/5 px-2 py-1 rounded-lg">
          {game.players.length}p
        </span>
      </header>

      <main className="page-scroll relative z-10 flex flex-col gap-3 pb-2">
        {game.players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isMe={player.id === myPlayerId}
            isHost={isHost}
            presenceOnline={presenceMap.get(player.id)?.isOnline ?? false}
            onToggle={() => void toggleCompletion(player.id)}
            onPickPhase={() => setPickerPlayerId(player.id)}
            game={game}
          />
        ))}

        {/* Emoji reactions */}
        <div className="card px-4 py-3 flex items-center gap-2">
          <p className="text-xs text-muted mr-1">React</p>
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => void react(emoji)}
              className="text-xl leading-none hover:scale-125 active:scale-110 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      </main>

      {isHost && game.status === "active" && (
        <footer className="page-footer relative z-10">
          <button className="setup-cta" onClick={() => void endRound()}>
            End round {game.round}
          </button>
        </footer>
      )}

      {/* Winner overlay */}
      {game.status === "finished" && winner && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
          <div className="card p-8 text-center max-w-sm w-full">
            <p className="text-6xl mb-4">🏆</p>
            <h2 className="font-display text-2xl font-bold text-white mb-1">
              {winner.name} wins!
            </h2>
            <p className="text-muted text-sm mb-6">
              All {game.phasesSnapshot.length} phases complete · Round {game.round - 1}
            </p>
            <button className="setup-cta" onClick={() => { leaveGame(); navigate("/") }}>
              Back to home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
