import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useTrackerStore } from "@/stores/trackerStore";
import { useAuthStore } from "@/stores/authStore";
import { usePresence } from "@/hooks/usePresence";
import { useReactions } from "@/hooks/useReactions";
import { computePlayerGameView } from "@/lib/gameUtils";
import type { Phase, Player, Game } from "@/types";

// ── Phase Picker Sheet ────────────────────────────────────────────────────────
function PhasePicker({
  phases,
  current,
  onPick,
  onClose,
}: {
  phases: Phase[];
  current: Phase | null;
  onPick: (phaseId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-end" onClick={onClose}>
      <div
        className="w-full max-h-[70vh] bg-[--color-bg-card] rounded-t-3xl flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ animationDuration: "0.2s" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h3 className="font-display font-bold text-white">Pick your phase</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/8 text-white/50 hover:text-white hover:bg-white/12 flex items-center justify-center text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex flex-col gap-1.5 p-3">
          {phases.map((phase) => {
            const active = phase.id === current?.id;
            return (
              <button
                key={phase.id}
                onClick={() => {
                  onPick(phase.id);
                  onClose();
                }}
                className={`card-interactive px-4 py-3 text-left transition-colors ${active ? "border-white/30 bg-white/6" : ""}`}
              >
                <p className="text-white text-sm">{phase.rule}</p>
                {phase.constraint && (
                  <p className="text-white/40 text-xs mt-0.5">{phase.constraint}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
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
  player: Player;
  isMe: boolean;
  isHost: boolean;
  presenceOnline: boolean;
  onToggle: () => void;
  onPickPhase: () => void;
  game: Game;
}) {
  const view = computePlayerGameView(player, game);
  const canPickPhase =
    isMe && !view.isWinner && !view.isInOrderedSection && view.freeChoicePhases.length > 0;
  const colorVar = `var(--color-player-${player.color})`;
  const pct = (view.completedCount / Math.max(view.totalCount, 1)) * 100;

  return (
    <div
      className={`card overflow-hidden transition-all ${isMe ? "ring-1 ring-white/20" : ""}`}
    >
      {/* Color accent stripe */}
      <div className="h-0.5 w-full" style={{ backgroundColor: colorVar }} />

      <div className="p-4 flex items-center gap-3">
        {/* Avatar + presence dot */}
        <div className="relative flex-shrink-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-display font-bold text-base text-white shadow-lg"
            style={{ backgroundColor: colorVar }}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[--color-bg-card] transition-colors ${presenceOnline ? "bg-green-400" : "bg-white/15"}`}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-semibold text-white truncate">{player.name}</p>
            {isMe && <span className="text-xs text-white/30">(you)</span>}
            {view.isWinner && (
              <span className="text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                🏆 Winner!
              </span>
            )}
            {player.isCompletedThisRound && !view.isWinner && (
              <span className="text-xs bg-green-400/20 text-green-300 px-2 py-0.5 rounded-full font-semibold">
                ✓ Done
              </span>
            )}
          </div>

          {/* Current phase */}
          <button
            disabled={!canPickPhase}
            onClick={onPickPhase}
            className={`text-xs mt-0.5 block text-left w-full ${canPickPhase ? "text-white/70 underline underline-offset-2 decoration-dotted hover:text-white" : "text-muted cursor-default"}`}
          >
            {view.isWinner
              ? "All phases complete! 🎉"
              : view.currentPhase
                ? view.currentPhase.rule
                : "No phase declared"}
            {canPickPhase && <span className="ml-1 opacity-40">▾</span>}
          </button>

          {/* Progress bar */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: colorVar }}
              />
            </div>
            <span className="text-xs text-white/30 tabular-nums flex-shrink-0">
              {view.completedCount}/{view.totalCount}
            </span>
          </div>
        </div>

        {/* Toggle completion */}
        {(isMe || isHost) && !view.isWinner && (
          <button
            onClick={onToggle}
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 text-base ${
              player.isCompletedThisRound
                ? "border-green-500 bg-green-500 text-white shadow-[0_0_12px_rgba(74,222,128,0.4)]"
                : "border-white/15 text-white/20 hover:border-white/40 hover:text-white/50"
            }`}
          >
            ✓
          </button>
        )}
      </div>
    </div>
  );
}

// ── GamePage ──────────────────────────────────────────────────────────────────
export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const { game, myPlayerId, status, toggleCompletion, declarePhase, endRound, leaveGame } =
    useTrackerStore();
  const { userId } = useAuthStore();
  const { presenceMap } = usePresence(gameId ?? null, myPlayerId);
  const { recentReactions, react, EMOJIS } = useReactions(gameId ?? null);

  const [pickerPlayerId, setPickerPlayerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const joinCode = game?.joinCode ?? "";

  const copyCode = useCallback(() => {
    if (!joinCode) return;
    void navigator.clipboard.writeText(joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [joinCode]);

  useEffect(() => {
    if (status === "idle" && !game) navigate("/");
  }, [status, game, navigate]);

  if (!game || !gameId) {
    return (
      <div className="page-root items-center justify-center">
        <p className="text-muted">{status === "loading" ? "Loading game…" : "Game not found."}</p>
      </div>
    );
  }

  const isHost = game.hostUserId === userId;
  const pickerPlayer = pickerPlayerId ? game.players.find((p) => p.id === pickerPlayerId) : null;
  const pickerView = pickerPlayer ? computePlayerGameView(pickerPlayer, game) : null;
  const winner = game.players.find((p) => p.completedPhaseIds.length >= game.phasesSnapshot.length);
  const doneCount = game.players.filter((p) => p.isCompletedThisRound).length;

  // Latest reaction for burst
  const latestReaction = recentReactions[recentReactions.length - 1];

  return (
    <div className="page-root relative">
      <div className="aurora-bg" />

      {/* Reaction burst overlay */}
      {latestReaction && (
        <div
          key={latestReaction.id}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 pointer-events-none z-50 select-none animate-fade-up"
          style={{ fontSize: "4rem", lineHeight: 1 }}
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

      {/* Header */}
      <header className="page-header relative z-10">
        <button
          className="btn-back"
          onClick={() => {
            leaveGame();
            navigate("/");
          }}
        >
          ←
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-white">Round {game.round}</h2>
            <span className="text-xs text-white/30">
              · {game.players.length} player{game.players.length !== 1 ? "s" : ""}
            </span>
          </div>
          {joinCode && (
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 mt-0.5 group"
              title="Copy join code"
            >
              <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
                Code:
              </span>
              <span className="text-xs font-mono font-bold tracking-widest text-white/70 group-hover:text-white transition-colors">
                {joinCode}
              </span>
              <span className="text-xs text-white/30 group-hover:text-white/60 transition-colors">
                {copied ? "✓" : "⎘"}
              </span>
            </button>
          )}
        </div>

        {/* Done count pill */}
        {game.status === "active" && (
          <div className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full bg-white/6 border border-white/8 text-white/50 tabular-nums">
            {doneCount}/{game.players.length} done
          </div>
        )}
      </header>

      {/* Player list */}
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
        <div className="card px-4 py-3">
          <p className="text-xs text-white/30 mb-2 font-display font-semibold tracking-wide uppercase">
            Reactions
          </p>
          <div className="flex items-center gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => void react(emoji)}
                className="flex-1 flex items-center justify-center py-2 rounded-xl bg-white/4 hover:bg-white/10 active:scale-90 transition-all text-xl leading-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* End round footer (host only) */}
      {isHost && game.status === "active" && (
        <footer className="page-footer relative z-10">
          <button
            className="setup-cta"
            onClick={() => void endRound()}
          >
            End round {game.round}
            {doneCount > 0 && (
              <span className="ml-2 opacity-70 font-normal text-sm">
                ({doneCount}/{game.players.length} done)
              </span>
            )}
          </button>
        </footer>
      )}

      {/* Winner overlay */}
      {game.status === "finished" && winner && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-6">
          <div className="card p-8 text-center max-w-sm w-full animate-scale-in">
            <div className="text-7xl mb-4 animate-bounce">🏆</div>
            <h2 className="font-display text-3xl font-bold text-white mb-2">
              {winner.name} wins!
            </h2>
            <p className="text-muted text-sm mb-2">
              All {game.phasesSnapshot.length} phases complete
            </p>
            <p className="text-white/30 text-xs mb-8">Round {game.round - 1}</p>

            {/* Final standings */}
            <div className="flex flex-col gap-2 mb-8 text-left">
              {[...game.players]
                .sort((a, b) => b.completedPhaseIds.length - a.completedPhaseIds.length)
                .map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-sm text-white/30 w-5 flex-shrink-0">{i + 1}.</span>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: `var(--color-player-${p.color})` }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm text-white">{p.name}</span>
                    <span className="text-xs text-white/40 tabular-nums">
                      {p.completedPhaseIds.length}/{game.phasesSnapshot.length}
                    </span>
                  </div>
                ))}
            </div>

            <button
              className="setup-cta"
              onClick={() => {
                leaveGame();
                navigate("/");
              }}
            >
              Back to home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
