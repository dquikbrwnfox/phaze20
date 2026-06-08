import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTrackerStore } from "@/stores/trackerStore";
import { useAuthStore } from "@/stores/authStore";
import { useLibraryStore, resolvePhases } from "@/stores/libraryStore";
import { BUILTIN_PHASE_SETS, BUILTIN_PHASES } from "@/lib/phaseData";
import { Avatar } from "@/components/Avatar";
import type { PlayerColor, PhaseSet } from "@/types";

const COLORS: PlayerColor[] = ["rose", "amber", "lime", "teal", "sky", "violet", "fuchsia", "orange"];

const GUEST_EMOJIS = [
  "🦊","🐻","🐸","🐯","🦁","🐺","🦝","🐨",
  "🐙","🦋","🦄","🐲","🦀","🐬","🦉","🐧",
  "🍕","🎸","⚡","🔥","💎","🎭","🚀","🎯",
];

export default function SetupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isJoin = params.get("join") === "1";

  const { createGame, joinGame, status } = useTrackerStore();
  const { userId, displayName, imageUrl: authImageUrl, status: authStatus } = useAuthStore();
  const { userSets, load } = useLibraryStore();

  const isOAuth = authStatus === "authenticated";

  const [name, setName] = useState("");
  const [color, setColor] = useState<PlayerColor>("sky");
  const [emoji, setEmoji] = useState<string>("🦊");
  const [joinCode, setJoinCode] = useState("");
  const [phaseSetId, setPhaseSetId] = useState(BUILTIN_PHASE_SETS[0].id);

  // Autofill name from OAuth account
  useEffect(() => {
    if (displayName && !name) setName(displayName);
  }, [displayName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  // Resolved avatar: OAuth photo or picked emoji
  const resolvedImageUrl = isOAuth ? authImageUrl : emoji;

  const allSets: PhaseSet[] = [...BUILTIN_PHASE_SETS, ...userSets];

  async function handleStart() {
    if (!userId) return;
    const finalImageUrl = resolvedImageUrl ?? null;
    if (isJoin) {
      await joinGame(joinCode.trim().toUpperCase(), name.trim(), color, userId, finalImageUrl);
      const game = useTrackerStore.getState().game;
      if (game) navigate(`/game/${game.id}?code=${game.joinCode}`);
    } else {
      const set = allSets.find((s) => s.id === phaseSetId) ?? BUILTIN_PHASE_SETS[0];
      const phases = set.isBuiltin
        ? BUILTIN_PHASES.filter((p) => set.phaseIds.includes(p.id))
        : resolvePhases(set.phaseIds);
      const orderedCount = phaseSetId === "classic" ? 10 : phaseSetId === "full-20" ? 20 : 0;
      const code = await createGame({
        playerName: name.trim(),
        playerColor: color,
        userId,
        imageUrl: finalImageUrl,
        phasesSnapshot: phases,
        phaseSetId,
        orderedCount,
      });
      const game = useTrackerStore.getState().game;
      if (game) navigate(`/game/${game.id}?code=${code}`);
    }
  }

  const busy = status === "loading";

  return (
    <div className="page-root">
      <header className="page-header">
        <button className="btn-back" onClick={() => navigate("/")}>←</button>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-cream)" }}>
          {isJoin ? "Join game" : "New game"}
        </h2>
        <span className="ml-auto text-xs opacity-20 select-none" aria-hidden>♠ ♥ ♦ ♣</span>
      </header>

      <main className="page-scroll flex flex-col gap-6 max-w-md mx-auto w-full">

        {/* Avatar preview + Name */}
        <div className="flex flex-col gap-2">
          <p className="section-heading">Your identity</p>
          <div className="flex items-center gap-3">
            {/* Avatar preview */}
            <div className="relative flex-shrink-0">
              <Avatar
                src={resolvedImageUrl ?? undefined}
                name={name || "?"}
                color={`var(--color-player-${color})`}
                size={52}
              />
            </div>
            {/* Name input */}
            <input
              className="flex-1 rounded-xl px-4 py-3 outline-none transition-colors"
              style={{
                background: "var(--color-bg-card)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--color-cream)",
                fontFamily: "var(--font-body)",
              }}
              placeholder="Your name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "rgba(201,168,76,0.4)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
          </div>
        </div>

        {/* Emoji picker — guests only */}
        {!isOAuth && (
          <div className="flex flex-col gap-2">
            <p className="section-heading">Pick your emoji</p>
            <div className="grid grid-cols-8 gap-1.5">
              {GUEST_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className="aspect-square rounded-xl flex items-center justify-center text-xl transition-all"
                  style={{
                    background: emoji === e ? "rgba(201,168,76,0.15)" : "var(--color-bg-card)",
                    border: `1px solid ${emoji === e ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.06)"}`,
                    transform: emoji === e ? "scale(1.1)" : "scale(1)",
                  }}
                  title={e}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color picker */}
        <div className="flex flex-col gap-2">
          <p className="section-heading">Your color</p>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-9 h-9 rounded-full transition-all"
                style={{
                  backgroundColor: `var(--color-player-${c})`,
                  boxShadow: color === c
                    ? `0 0 0 2px var(--color-bg-base), 0 0 0 4px var(--color-player-${c})`
                    : "none",
                  transform: color === c ? "scale(1.12)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Join code or Phase set */}
        {isJoin ? (
          <div className="flex flex-col gap-2">
            <p className="section-heading">Game code</p>
            <input
              className="rounded-xl px-4 py-3 outline-none text-center text-xl uppercase tracking-[0.35em] transition-colors"
              style={{
                background: "var(--color-bg-card)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--color-cream)",
                fontFamily: "var(--font-mono)",
              }}
              placeholder="XXXXX"
              maxLength={5}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "rgba(201,168,76,0.4)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="section-heading">Phase set</p>
              <button
                className="text-xs transition-colors"
                style={{ color: "var(--color-muted)" }}
                onClick={() => navigate("/library")}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-cream)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-muted)")}
              >
                Manage →
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {allSets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPhaseSetId(s.id)}
                  className={`card-interactive px-4 py-3 text-left ${phaseSetId === s.id ? "selected" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <p
                      className="font-semibold text-sm"
                      style={{ fontFamily: "var(--font-display)", color: "var(--color-cream)" }}
                    >
                      {s.name}
                    </p>
                    {!s.isBuiltin && (
                      <span className="text-xs" style={{ color: "var(--color-muted)" }}>custom</span>
                    )}
                    {phaseSetId === s.id && (
                      <span className="ml-auto text-xs" style={{ color: "var(--color-gold)" }}>♦ selected</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
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
  );
}
