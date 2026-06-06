import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLibraryStore } from "@/stores/libraryStore";
import { useAuthStore } from "@/stores/authStore";

export default function LibraryPage() {
  const navigate = useNavigate();
  const { userId } = useAuthStore();
  const { userSets, loading, load, remove } = useLibraryStore();

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  return (
    <div className="page-root">
      <header className="page-header">
        <button className="btn-back" onClick={() => navigate("/")}>
          ←
        </button>
        <h2 className="font-display font-bold text-white">My phase sets</h2>
        <button
          className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1.5"
          onClick={() => navigate("/library/create")}
        >
          + New
        </button>
      </header>

      <main className="page-scroll flex flex-col gap-3 max-w-md mx-auto w-full">
        {loading && <p className="text-muted text-sm text-center py-8">Loading…</p>}

        {!loading && userSets.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-muted text-sm mb-4">No custom sets yet.</p>
            <button
              className="text-sm text-white/70 hover:text-white transition-colors underline underline-offset-2"
              onClick={() => navigate("/library/create")}
            >
              Create your first set
            </button>
          </div>
        )}

        {userSets.map((set) => (
          <div key={set.id} className="card p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-white text-sm">{set.name}</p>
              {set.description && <p className="text-muted text-xs mt-0.5">{set.description}</p>}
              <p className="text-white/30 text-xs mt-1">{set.phaseIds.length} phases</p>
            </div>
            <button
              onClick={() => void remove(set.id)}
              className="text-white/20 hover:text-rose-400 transition-colors text-lg leading-none flex-shrink-0 mt-0.5"
              title="Delete set"
            >
              ×
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}
