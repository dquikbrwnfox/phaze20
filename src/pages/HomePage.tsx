import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Avatar } from "@/components/Avatar";

// ── Google SVG logo ───────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

// ── GitHub SVG logo ───────────────────────────────────────────────
function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  );
}

// ── Suit decoration ───────────────────────────────────────────────
function Suits({ className = "" }: { className?: string }) {
  return (
    <span className={`select-none pointer-events-none ${className}`} aria-hidden>
      ♠ ♥ ♦ ♣
    </span>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { status, displayName, imageUrl, signInGoogle, signInGithub } = useAuthStore();
  const appName = import.meta.env.VITE_APP_NAME ?? "Phaze20";
  const isAuth = status === "authenticated";
  const isAnon = status === "anon";
  const isReady = isAuth || isAnon;

  return (
    <div className="page-root relative overflow-hidden">
      {/* Felt background */}
      <div className="felt-bg" />

      {/* Corner suit decorations */}
      <div className="absolute top-4 left-4 z-0 text-[var(--color-gold)] opacity-10 text-sm tracking-widest hidden sm:block">
        ♠ ♥ ♦ ♣
      </div>
      <div className="absolute top-4 right-4 z-0 text-[var(--color-gold)] opacity-10 text-sm tracking-widest hidden sm:block">
        ♣ ♦ ♥ ♠
      </div>

      <main className="flex flex-col items-center justify-center flex-1 gap-8 px-6 relative z-10 py-12">

        {/* Logo / wordmark */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-2xl relative"
            style={{
              background: "linear-gradient(135deg, #1a4430 0%, #0e2d1c 100%)",
              border: "1px solid rgba(201,168,76,0.3)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            🃏
          </div>
          <div>
            <h1
              className="text-5xl font-bold text-[var(--color-cream)] tracking-tight"
              style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
            >
              {appName}
            </h1>
            <Suits className="text-[var(--color-gold)] opacity-30 text-xs tracking-[0.4em] mt-1 block text-center" />
          </div>
          <p style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>
            Phase 10 tracker — realtime, multiplayer
          </p>
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div className="flex items-center gap-2" style={{ color: "var(--color-muted)" }}>
            <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin block opacity-50" />
            <span className="text-sm">Connecting…</span>
          </div>
        )}

        {/* Auth gate — only if not yet signed in */}
        {status === "anon" && (
          <div
            className="w-full max-w-xs rounded-2xl p-5 flex flex-col gap-3"
            style={{
              background: "rgba(10,33,23,0.8)",
              border: "1px solid rgba(201,168,76,0.18)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
          >
            <p
              className="text-center text-sm mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-cream)", opacity: 0.7 }}
            >
              Sign in to save progress
            </p>

            <button
              className="btn-oauth btn-oauth-google"
              onClick={() => void signInGoogle()}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <button
              className="btn-oauth btn-oauth-github"
              onClick={() => void signInGithub()}
            >
              <GitHubIcon />
              Continue with GitHub
            </button>

            <div className="gold-divider my-1" />

            {/* Already anonymous — just proceed */}
            <button
              onClick={() => navigate("/setup")}
              className="w-full py-2 text-sm transition-colors"
              style={{ color: "var(--color-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-cream)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-muted)")}
            >
              Play as guest →
            </button>
          </div>
        )}

        {/* Signed-in user chip */}
        {isAuth && (
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-full"
            style={{
              background: "rgba(26,68,48,0.8)",
              border: "1px solid rgba(201,168,76,0.2)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Avatar
              src={imageUrl}
              name={displayName ?? "Player"}
              size={28}
            />
            <span className="text-sm" style={{ color: "var(--color-cream)", fontWeight: 500 }}>
              {displayName ?? "Player"}
            </span>
          </div>
        )}

        {/* Navigation CTAs */}
        {isReady && (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={() => navigate("/setup")} className="setup-cta">
              New game
            </button>
            <button
              onClick={() => navigate("/setup?join=1")}
              className="w-full py-3.5 rounded-xl font-semibold transition-all"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--color-cream)",
                fontFamily: "var(--font-display)",
                background: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Join by code
            </button>
            <button
              onClick={() => navigate("/library")}
              className="w-full py-2 text-sm transition-colors"
              style={{ color: "var(--color-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-cream)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-muted)")}
            >
              Phase sets →
            </button>
          </div>
        )}
      </main>

      <footer className="relative z-10 pb-safe flex justify-center pt-2 pb-6">
        <p className="text-xs" style={{ color: "rgba(107,143,120,0.4)" }}>
          multiplayer phase tracker
        </p>
      </footer>
    </div>
  );
}
