import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export default function HomePage() {
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);

  return (
    <div className="page-root">
      <div className="aurora-bg" />
      <main className="flex flex-col items-center justify-center flex-1 gap-6 px-6 relative z-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-4xl font-bold text-white">
            {import.meta.env.VITE_APP_NAME ?? "Phaze20"}
          </h1>
          <p className="text-muted text-sm">Phase 10 tracker — realtime, multiplayer</p>
        </div>

        {status === "loading" ? (
          <p className="text-muted text-sm">Connecting…</p>
        ) : (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={() => navigate("/setup")} className="setup-cta">
              New game
            </button>
            <button
              onClick={() => navigate("/setup?join=1")}
              className="w-full py-3 rounded-2xl border border-white/15 text-white font-display font-semibold hover:bg-white/5 transition-colors"
            >
              Join by code
            </button>
            <button
              onClick={() => navigate("/library")}
              className="w-full py-2 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Phase sets
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
