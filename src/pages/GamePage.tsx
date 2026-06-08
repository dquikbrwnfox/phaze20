import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useTrackerStore } from "@/stores/trackerStore";
import { useAuthStore } from "@/stores/authStore";
import { usePresence } from "@/hooks/usePresence";
import { useReactions } from "@/hooks/useReactions";
import { computePlayerGameView } from "@/lib/gameUtils";
import { Avatar } from "@/components/Avatar";
import type { Phase, Player, Game } from "@/types";

// ── Phase Picker Sheet ────────────────────────────────────────────
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
    <div className="fixed inset-0 z-40 bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full max-h-[70vh] rounded-t-3xl flex flex-col overflow-hidden animate-scale-in"
        style={{
          background: "var(--color-bg-raised)",
          border: "1px solid rgba(201,168,76,0.2)",
          borderBottom: "none",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}
        >
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-cream)" }}>
            ♦ Pick your phase
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
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
                onClick={() => { onPick(phase.id); onClose(); }}
                className={`card-interactive px-4 py-3 text-left transition-colors ${active ? "selected" : ""}`}
              >
                <p className="text-sm" style={{ color: "var(--color-cream)" }}>{phase.rule}</p>
                {phase.constraint && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{phase.constraint}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Player Card ───────────────────────────────────────────────────
function PlayerCard({
  player,
  isMe,
  isHost,
  presenceOnline,
  onToggle,
  onPickPhase,
  onAdjust,
  game,
}: {
  player: Player;
  isMe: boolean;
  isHost: boolean;
  presenceOnline: boolean;
  onToggle: () => void;
  onPickPhase: () => void;
  onAdjust: (delta: number) => void;
  game: Game;
}) {
  const view = computePlayerGameView(player, game);
  const canPickPhase = isMe && !view.isWinner && !view.isInOrderedSection && view.freeChoicePhases.length > 0;
  const colorVar = `var(--color-player-${player.color})`;
  const pct = (view.completedCount / Math.max(view.totalCount, 1)) * 100;

  return (
    <div className={`player-card ${isMe ? "is-me" : ""}`}>
      {/* Color stripe + suit accent */}
      <div className="h-1 w-full" style={{ background: colorVar }} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0 mt-0.5">
            <Avatar
              src={player.imageUrl ?? undefined}
              name={player.name}
              color={colorVar}
              size={44}
            />
            {/* Online dot */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 transition-colors"
              style={{
                borderColor: "var(--color-bg-card)",
                backgroundColor: presenceOnline ? "#4ade80" : "rgba(255,255,255,0.12)",
              }}
            />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className="font-semibold truncate"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-cream)" }}
              >
                {player.name}
              </p>
              {isMe && <span className="you-badge">YOU</span>}
              {view.isWinner && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(201,168,76,0.15)", color: "var(--color-gold)" }}
                >
                  🏆 Winner!
                </span>
              )}
              {player.isCompletedThisRound && !view.isWinner && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}
                >
                  ✓ Done
                </span>
              )}
            </div>

            {/* Current phase */}
            <button
              disabled={!canPickPhase}
              onClick={onPickPhase}
              className="text-xs mt-0.5 text-left w-full block transition-colors"
              style={{
                color: canPickPhase ? "rgba(245,230,200,0.7)" : "var(--color-muted)",
                cursor: canPickPhase ? "pointer" : "default",
                textDecoration: canPickPhase ? "underline" : "none",
                textDecorationStyle: canPickPhase ? "dotted" : undefined,
                textUnderlineOffset: "3px",
              }}
              onMouseEnter={(e) => { if (canPickPhase) e.currentTarget.style.color = "var(--color-cream)"; }}
              onMouseLeave={(e) => { if (canPickPhase) e.currentTarget.style.color = "rgba(245,230,200,0.7)"; }}
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
              <div className="flex-1 progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: colorVar,
                    "--fill-color": colorVar,
                  } as React.CSSProperties}
                />
              </div>
              <span
                className="text-xs flex-shrink-0 tabular-nums"
                style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}
              >
                {view.completedCount}/{view.totalCount}
              </span>
            </div>
          </div>

          {/* Right-side controls */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            {/* Completion toggle — only for own card */}
            {isMe && !view.isWinner && (
              <button
                onClick={onToggle}
                className={`complete-btn ${player.isCompletedThisRound ? "checked" : "unchecked"}`}
                title={player.isCompletedThisRound ? "Mark incomplete" : "Mark complete"}
              >
                ✓
              </button>
            )}

            {/* Host phase adjust — only host, only other players */}
            {isHost && !isMe && (
              <div className="flex gap-0.5">
                <button
                  onClick={() => onAdjust(-1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-muted)" }}
                  title="Remove phase"
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-cream)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-muted)"}
                >
                  −
                </button>
                <button
                  onClick={() => onAdjust(+1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-muted)" }}
                  title="Add phase"
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-cream)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-muted)"}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GamePage ──────────────────────────────────────────────────────
export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const { game, myPlayerId, status, toggleCompletion, declarePhase, endRound, leaveGame, adjustPlayerPhase } =
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
        <p style={{ color: "var(--color-muted)" }}>
          {status === "loading" ? "Loading game…" : "Game not found."}
        </p>
      </div>
    );
  }

  const isHost = game.hostUserId === userId;
  const pickerPlayer = pickerPlayerId ? game.players.find((p) => p.id === pickerPlayerId) : null;
  const pickerView = pickerPlayer ? computePlayerGameView(pickerPlayer, game) : null;
  const winner = game.players.find((p) => p.completedPhaseIds.length >= game.phasesSnapshot.length);
  const doneCount = game.players.filter((p) => p.isCompletedThisRound).length;
  const latestReaction = recentReactions[recentReactions.length - 1];

  return (
    <div className="page-root relative">
      <div className="felt-bg" />

      {/* Floating reaction burst */}
      {latestReaction && (
        <div
          key={latestReaction.id}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 pointer-events-none z-50 select-none reaction-float"
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
          onClick={() => { leaveGame(); navigate("/"); }}
        >
          ←
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-cream)" }}>
              Round {game.round}
            </h2>
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>
              · {game.players.length} player{game.players.length !== 1 ? "s" : ""}
            </span>
          </div>
          {joinCode && (
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 mt-0.5 group"
              title="Copy join code"
            >
              <span className="text-xs" style={{ color: "var(--color-muted)" }}>Code:</span>
              <span
                className="text-xs join-code"
                style={{ color: copied ? "var(--color-gold)" : "rgba(245,230,200,0.6)" }}
              >
                {joinCode}
              </span>
              <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                {copied ? "✓" : "⎘"}
              </span>
            </button>
          )}
        </div>

        {/* Done count + host crown */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isHost && (
            <span title="You are the host" style={{ fontSize: "1rem" }}>👑</span>
          )}
          {game.status === "active" && (
            <div
              className="text-xs px-2.5 py-1 rounded-full tabular-nums"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "var(--color-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {doneCount}/{game.players.length}
            </div>
          )}
        </div>
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
            onPickPhase={() => {
              if (player.id === myPlayerId) setPickerPlayerId(player.id);
            }}
            onAdjust={(delta) => void adjustPlayerPhase(player.id, delta)}
            game={game}
          />
        ))}

        {/* Gold divider */}
        <div className="gold-divider mx-1 my-1" />

        {/* Emoji reactions */}
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: "var(--color-bg-card)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p
            className="text-xs mb-2 uppercase tracking-widest"
            style={{ fontFamily: "var(--font-mono)", color: "var(--color-muted)", fontSize: "0.65rem" }}
          >
            ♣ Reactions
          </p>
          <div className="flex items-center gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => void react(emoji)}
                className="flex-1 flex items-center justify-center py-2 rounded-xl text-xl leading-none transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.03)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
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
          <button className="setup-cta" onClick={() => void endRound()}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(6,18,11,0.9)", backdropFilter: "blur(8px)" }}>
          <div
            className="p-8 text-center max-w-sm w-full animate-scale-in rounded-2xl"
            style={{
              background: "var(--color-bg-raised)",
              border: "1px solid rgba(201,168,76,0.3)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.1)",
            }}
          >
            <div className="text-7xl mb-4 animate-bounce">🏆</div>
            <h2
              className="text-3xl font-bold mb-2 text-shimmer"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {winner.name} wins!
            </h2>
            <p className="text-sm mb-2" style={{ color: "var(--color-muted)" }}>
              All {game.phasesSnapshot.length} phases complete
            </p>
            <p className="text-xs mb-6" style={{ color: "rgba(107,143,120,0.5)" }}>
              Round {game.round - 1}
            </p>

            <div className="gold-divider mb-6" />

            {/* Final standings */}
            <div className="flex flex-col gap-2.5 mb-8 text-left">
              {[...game.players]
                .sort((a, b) => b.completedPhaseIds.length - a.completedPhaseIds.length)
                .map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span
                      className="text-sm w-5 flex-shrink-0 tabular-nums"
                      style={{ color: i === 0 ? "var(--color-gold)" : "var(--color-muted)", fontFamily: "var(--font-mono)" }}
                    >
                      {i + 1}.
                    </span>
                    <Avatar
                      src={p.imageUrl ?? undefined}
                      name={p.name}
                      color={`var(--color-player-${p.color})`}
                      size={28}
                    />
                    <span className="flex-1 text-sm" style={{ color: "var(--color-cream)" }}>{p.name}</span>
                    <span
                      className="text-xs tabular-nums"
                      style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}
                    >
                      {p.completedPhaseIds.length}/{game.phasesSnapshot.length}
                    </span>
                  </div>
                ))}
            </div>

            <button
              className="setup-cta"
              onClick={() => { leaveGame(); navigate("/"); }}
            >
              Back to home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
