import { create } from "zustand";
import { account } from "@/lib/appwrite";
import type { Models } from "appwrite";
import { AppwriteException, OAuthProvider } from "appwrite";

type AuthStatus = "loading" | "anon" | "authenticated" | "error";

interface AuthState {
  status: AuthStatus;
  user: Models.User<Models.Preferences> | null;
  /** Appwrite user $id */
  userId: string | null;
  init: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInGithub: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  userId: null,

  async init() {
    try {
      const user = await account.get();
      set({ user, userId: user.$id, status: user.email ? "authenticated" : "anon" });
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 401) {
        // No session — create anonymous
        try {
          await account.createAnonymousSession();
          const user = await account.get();
          set({ user, userId: user.$id, status: "anon" });
        } catch {
          set({ status: "error", user: null, userId: null });
        }
      } else {
        set({ status: "error", user: null, userId: null });
      }
    }
  },

  async signInGoogle() {
    const origin = window.location.origin;
    await account.createOAuth2Session(OAuthProvider.Google, `${origin}/`, `${origin}/`);
  },

  async signInGithub() {
    const origin = window.location.origin;
    await account.createOAuth2Session(OAuthProvider.Github, `${origin}/`, `${origin}/`);
  },

  async signOut() {
    await account.deleteSession("current");
    // Re-init to get a fresh anon session
    set({ status: "loading", user: null, userId: null });
    await get().init();
  },
}));
