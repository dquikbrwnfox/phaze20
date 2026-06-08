import { Client, Account, Databases, Realtime, Storage } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string;

if (!endpoint || !projectId) {
  throw new Error("Missing VITE_APPWRITE_ENDPOINT or VITE_APPWRITE_PROJECT_ID");
}

export const client = new Client().setEndpoint(endpoint).setProject(projectId);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const realtime = new Realtime(client);

export const AVATARS_BUCKET = "avatars";

export const DB_ID = (import.meta.env.VITE_APPWRITE_DB_ID as string | undefined) ?? "phaze20";

export const TABLE = {
  GAMES: "games",
  PLAYERS: "players",
  PRESENCE: "presence",
  REACTIONS: "reactions",
  PHASE_SETS: "phaseSets",
  PHASES: "phases",
} as const;
