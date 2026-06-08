import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ID, Permission, Role } from "appwrite";
import { useTrackerStore } from "@/stores/trackerStore";
import { useAuthStore } from "@/stores/authStore";
import { useLibraryStore, resolvePhases } from "@/stores/libraryStore";
import { BUILTIN_PHASE_SETS, BUILTIN_PHASES } from "@/lib/phaseData";
import { randomName } from "@/lib/nameGenerator";
import { storage, AVATARS_BUCKET } from "@/lib/appwrite";
import { Avatar } from "@/components/Avatar";
import type { PlayerColor, PhaseSet } from "@/types";

const COLORS: PlayerColor[] = ["rose", "amber", "lime", "teal", "sky", "violet", "fuchsia", "orange"];

const LS_NICKNAME = "phaze20:nickname";
const LS_AVATAR   = "phaze20:avatar";

export default function SetupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isJoin = params.get("join") === "1";

  const { createGame, joinGame, status: gameStatus } = useTrackerStore();
  const { userId, imageUrl: oauthImageUrl, status: authStatus } = useAuthStore();
  const { userSets, load } = useLibraryStore();

  const isOAuth = authStatus === "authenticated";

  // ── Persisted state ──────────────────────────────────────────────
  const [nickname, setNickname] = useState<string>(() => localStorage.getItem(LS_NICKNAME) ?? "");
  const [avatar, setAvatar]     = useState<string>(() => localStorage.getItem(LS_AVATAR) ?? "🦊");
  const [uploading, setUploading] = useState(false);

  // ── Game setup state ─────────────────────────────────────────────
  const [color, setColor]     = useState<PlayerColor>("sky");
  const [joinCode, setJoinCode] = useState("");
  const [phaseSetId, setPhaseSetId] = useState(BUILTIN_PHASE_SETS[0].id);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (userId) void load(userId); }, [userId, load]);

  // Persist nickname + avatar to localStorage whenever they change
  useEffect(() => { localStorage.setItem(LS_NICKNAME, nickname); }, [nickname]);
  useEffect(() => { localStorage.setItem(LS_AVATAR, avatar);    }, [avatar]);

  // Resolved avatar: OAuth photo if signed in (can be overridden by upload), else chosen emoji/photo
  const resolvedAvatar = isOAuth && oauthImageUrl && !isCustomUpload(avatar)
    ? oauthImageUrl
    : avatar;

  function isCustomUpload(val: string) {
    return val.startsWith("http");
  }

  // ── Photo upload ─────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const doc = await storage.createFile(
        AVATARS_BUCKET,
        ID.unique(),
        file,
        [Permission.read(Role.any()), Permission.delete(Role.user(userId))],
      );
      const url = storage.getFileView(AVATARS_BUCKET, doc.$id).toString();
      setAvatar(url);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Emoji input handler ──────────────────────────────────────────
  function handleEmojiChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (!raw) return;
    // Extract grapheme clusters to handle multi-codepoint emoji
    try {
      const segs = [...new Intl.Segmenter().segment(raw)].map((s) => s.segment);
      const last = segs[segs.length - 1];
      if (last) setAvatar(last);
    } catch {
      setAvatar(raw.slice(-2));
    }
  }

  // ── Random name ──────────────────────────────────────────────────
  function rollName() { setNickname(randomName()); }

  const allSets: PhaseSet[] = [...BUILTIN_PHASE_SETS, ...userSets];

  // ── Submit ───────────────────────────────────────────────────────
  async function handleStart() {
    if (!userId) return;
    const name = nickname.trim() || randomName();
    const imageUrl = resolvedAvatar ?? null;

    if (isJoin) {
      await joinGame(joinCode.trim().toUpperCase(), name, color, userId, imageUrl);
      const game = useTrackerStore.getState().game;
      if (game) navigate(`/game/${game.id}?code=${game.joinCode}`);
    } else {
      const set = allSets.find((s) => s.id === phaseSetId) ?? BUILTIN_PHASE_SETS[0];
      const phases = set.isBuiltin
        ? BUILTIN_PHASES.filter((p) => set.phaseIds.includes(p.id))
        : resolvePhases(set.phaseIds);
      const orderedCount = phaseSetId === "classic" ? 10 : phaseSetId === "full-20" ? 20 : 0;
      const code = await createGame({
        playerName: name,
        playerColor: color,
        userId,
        imageUrl,
        phasesSnapshot: phases,
        phaseSetId,
        orderedCount,
      });
      const game = useTrackerStore.getState().game;
      if (game) navigate(`/game/${game.id}?code=${code}`);
    }
  }

  const busy = gameStatus === "loading" || uploading;
  const canSubmit = nickname.trim().length > 0 && (!isJoin || joinCode.trim().length === 5);

  return (
    <div className="page-root">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />

      <header className="page-header">
        <button className="btn-back" onClick={() => navigate("/")}>←</button>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-cream)" }}>
          {isJoin ? "Join game" : "New game"}
        </h2>
        <span className="ml-auto text-xs select-none" style={{ color: "var(--color-gold)", opacity: 0.2 }}>
          ♠ ♥ ♦ ♣
        </span>
      </header>

      <main className="page-scroll flex flex-col gap-7 max-w-md mx-auto w-full">

        {/* ── Avatar + Nickname ─────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <p className="section-heading" style={{ marginBottom: 0 }}>Your profile</p>

          {/* Avatar row */}
          <div className="flex items-center gap-4">
            {/* Clickable avatar with upload overlay */}
            <div className="relative flex-shrink-0 group">
              <Avatar
                src={resolvedAvatar}
                name={nickname || "?"}
                color={`var(--color-player-${color})`}
                size={64}
              />
              {/* Camera overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.55)", fontSize: "1.25rem" }}
                title="Upload photo"
              >
                {uploading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin block" />
                ) : "📷"}
              </button>
              {/* Remove custom photo — show X badge if custom upload active */}
              {isCustomUpload(avatar) && (
                <button
                  onClick={() => setAvatar("🦊")}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ background: "var(--color-red-felt)", color: "white", border: "2px solid var(--color-bg-base)" }}
                  title="Remove photo"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Nickname + dice */}
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl px-3 py-2.5 outline-none transition-colors text-sm"
                  style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--color-cream)",
                    fontFamily: "var(--font-body)",
                  }}
                  placeholder="Nickname…"
                  maxLength={20}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(201,168,76,0.4)")}
                  onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                />
                <button
                  onClick={rollName}
                  className="px-3 rounded-xl text-lg transition-all active:scale-90"
                  style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--color-cream)",
                  }}
                  title="Random name"
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                >
                  🎲
                </button>
              </div>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                {isOAuth && !isCustomUpload(avatar)
                  ? "Using your Google photo · upload to override"
                  : "Tap avatar to upload a photo"}
              </p>
            </div>
          </div>

          {/* Emoji input — shown when no custom photo */}
          {!isCustomUpload(avatar) && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                  Or pick an emoji
                </span>
              </div>
              {/* Native emoji input — surfaces device keyboard */}
              <div className="relative">
                <input
                  ref={emojiInputRef}
                  type="text"
                  value={avatar.startsWith("http") ? "" : avatar}
                  onChange={handleEmojiChange}
                  className="rounded-xl text-center outline-none transition-colors"
                  style={{
                    width: "3.5rem",
                    height: "3.5rem",
                    fontSize: "1.75rem",
                    lineHeight: 1,
                    background: "var(--color-bg-card)",
                    border: "1px solid rgba(201,168,76,0.25)",
                    color: "var(--color-cream)",
                    cursor: "pointer",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(201,168,76,0.6)")}
                  onBlur={(e)  => (e.target.style.borderColor = "rgba(201,168,76,0.25)")}
                  title="Click to open emoji keyboard (Win+. or Cmd+Ctrl+Space on desktop)"
                  inputMode="text"
                  autoComplete="off"
                />
              </div>
              <p className="text-xs flex-1" style={{ color: "var(--color-muted)" }}>
                Tap the box · on mobile your emoji keyboard opens
              </p>
            </div>
          )}
        </section>

        {/* ── Color ────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <p className="section-heading" style={{ marginBottom: 0 }}>Your color</p>
          <div className="flex gap-2.5 flex-wrap">
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
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </section>

        {/* ── Join code or Phase set ────────────────────────── */}
        {isJoin ? (
          <section className="flex flex-col gap-2">
            <p className="section-heading" style={{ marginBottom: 0 }}>Game code</p>
            <input
              className="rounded-xl px-4 py-3.5 outline-none text-center text-2xl uppercase tracking-[0.35em] transition-colors"
              style={{
                background: "var(--color-bg-card)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--color-cream)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.35em",
              }}
              placeholder="XXXXX"
              maxLength={5}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onFocus={(e) => (e.target.style.borderColor = "rgba(201,168,76,0.4)")}
              onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
          </section>
        ) : (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="section-heading" style={{ marginBottom: 0 }}>Phase set</p>
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
                    <p className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--color-cream)" }}>
                      {s.name}
                    </p>
                    {!s.isBuiltin && <span className="text-xs" style={{ color: "var(--color-muted)" }}>custom</span>}
                    {phaseSetId === s.id && <span className="ml-auto text-xs" style={{ color: "var(--color-gold)" }}>♦</span>}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                    {s.description || `${s.phaseIds.length} phases`}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="page-footer">
        <button
          className="setup-cta"
          disabled={busy || !canSubmit}
          onClick={() => void handleStart()}
        >
          {uploading ? "Uploading…" : busy ? "Connecting…" : isJoin ? "Join game" : "Create game"}
        </button>
        {!nickname.trim() && (
          <p className="text-xs text-center mt-1.5" style={{ color: "var(--color-muted)" }}>
            Enter a nickname to continue
          </p>
        )}
      </footer>
    </div>
  );
}
