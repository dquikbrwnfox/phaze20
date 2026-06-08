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
  /** Human-readable name (from OAuth or set later) */
  displayName: string | null;
  /** Profile photo URL (from OAuth provider) */
  imageUrl: string | null;

  init: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInGithub: () => Promise<void>;
  signOut: () => Promise<void>;
}

function resolveImageUrl(user: Models.User<Models.Preferences>): string | null {
  // Appwrite OAuth users may have their avatar in prefs.
  // Prefs is a free-form object; cast to index access.
  const p = user.prefs as Record<string, unknown>;
  for (const key of ["avatarUrl", "imageUrl", "picture", "avatar"]) {
    if (typeof p[key] === "string" && (p[key] as string).startsWith("http")) {
      return p[key] as string;
    }
  }
  return null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  userId: null,
  displayName: null,
  imageUrl: null,

  async init() {
    try {
      const user = await account.get();
      const isAnon = !user.email;
      set({
        user,
        userId: user.$id,
        status: isAnon ? "anon" : "authenticated",
        displayName: user.name || null,
        imageUrl: resolveImageUrl(user),
      });
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 401) {
        try {
          await account.createAnonymousSession();
          const user = await account.get();
          set({ user, userId: user.$id, status: "anon", displayName: null, imageUrl: null });
        } catch {
          set({ status: "error", user: null, userId: null, displayName: null, imageUrl: null });
        }
      } else {
        set({ status: "error", user: null, userId: null, displayName: null, imageUrl: null });
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
    set({ status: "loading", user: null, userId: null, displayName: null, imageUrl: null });
    await get().init();
  },
}));
