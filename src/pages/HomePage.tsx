import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export default function HomePage() {
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const appName = import.meta.env.VITE_APP_NAME ?? "Phaze20";

  return (
    <div className="page-root">
      <div className="aurora-bg" />
      <main className="flex flex-col items-center justify-center flex-1 gap-8 px-6 relative z-10">
        {/* Logo / wordmark */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent) 0%, oklch(65% 0.25 15) 100%)",
            }}
          >
            🃏
          </div>
          <h1 className="font-display text-5xl font-bold text-white tracking-tight">{appName}</h1>
          <p className="text-white/40 text-sm">Phase 10 tracker — realtime, multiplayer</p>
        </div>

        {status === "loading" ? (
          <div className="flex items-center gap-2 text-white/30">
            <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin block" />
            <span className="text-sm">Connecting…</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => navigate("/setup")}
              className="setup-cta"
            >
              New game
            </button>
            <button
              onClick={() => navigate("/setup?join=1")}
              className="w-full py-3.5 rounded-2xl border border-white/12 text-white font-display font-semibold hover:bg-white/5 hover:border-white/20 active:scale-98 transition-all"
            >
              Join by code
            </button>
            <button
              onClick={() => navigate("/library")}
              className="w-full py-2 text-sm text-white/30 hover:text-white/60 transition-colors"
            >
              Phase sets →
            </button>
          </div>
        )}
      </main>

      {/* Version / build info */}
      <footer className="relative z-10 pb-safe flex justify-center pt-2 pb-6">
        <p className="text-xs text-white/15">multiplayer phase tracker</p>
      </footer>
    </div>
  );
}
