import { useEffect, useState, useCallback, useRef } from "react";
import { ID, Query } from "appwrite";
import { databases, realtime, DB_ID, TABLE } from "@/lib/appwrite";
import type { PresenceRow } from "@/types";

const HEARTBEAT_INTERVAL_MS = 10_000;
const ONLINE_THRESHOLD_MS = 25_000;

export interface PlayerPresence {
  playerId: string;
  isOnline: boolean;
  isThinking: boolean;
}

export function usePresence(gameId: string | null, myPlayerId: string | null) {
  const [presenceMap, setPresenceMap] = useState<Map<string, PlayerPresence>>(new Map());
  const rowIdRef = useRef<string | null>(null);

  const beat = useCallback(async () => {
    if (!gameId || !myPlayerId) return;
    const now = new Date().toISOString();
    try {
      if (rowIdRef.current) {
        await databases.updateDocument(DB_ID, TABLE.PRESENCE, rowIdRef.current, {
          lastSeen: now,
        });
      } else {
        const doc = await databases.createDocument<PresenceRow>(
          DB_ID,
          TABLE.PRESENCE,
          ID.unique(),
          { gameId, playerId: myPlayerId, lastSeen: now, isThinking: false },
        );
        rowIdRef.current = doc.$id;
      }
    } catch {
      // presence is best-effort
    }
  }, [gameId, myPlayerId]);

  const setThinking = useCallback(async (thinking: boolean) => {
    if (!rowIdRef.current) return;
    try {
      await databases.updateDocument(DB_ID, TABLE.PRESENCE, rowIdRef.current, { isThinking: thinking });
    } catch {
      // presence is best-effort
    }
  }, []);

  useEffect(() => {
    if (!gameId) return;

    // Initial load
    databases.listDocuments<PresenceRow>(DB_ID, TABLE.PRESENCE, [
      Query.equal("gameId", gameId),
    ]).then((res) => updateMap(res.documents)).catch(() => {});

    // Heartbeat
    void beat();
    const interval = setInterval(() => { void beat(); }, HEARTBEAT_INTERVAL_MS);

    // Subscribe
    const channel = `databases.${DB_ID}.collections.${TABLE.PRESENCE}.documents`;
    let subClosed = false;
    let closeSub: (() => void) | null = null;
    realtime.subscribe(channel, (evt) => {
      if (subClosed) return;
      const evts = evt.events as string[];
      if (!evts.some((e) => e.includes(`.${TABLE.PRESENCE}.`))) return;
      const row = evt.payload as PresenceRow;
      if (row.gameId !== gameId) return;
      setPresenceMap((prev) => {
        const next = new Map(prev);
        next.set(row.playerId, { playerId: row.playerId, isOnline: isOnline(row.lastSeen), isThinking: row.isThinking });
        return next;
      });
    }).then((s) => { closeSub = () => { void (s as { close?: () => void }).close?.(); }; }).catch(() => {});

    return () => {
      subClosed = true;
      clearInterval(interval);
      closeSub?.();
    };
  }, [gameId, beat]);

  function updateMap(rows: PresenceRow[]) {
    const m = new Map<string, PlayerPresence>();
    for (const r of rows) {
      m.set(r.playerId, { playerId: r.playerId, isOnline: isOnline(r.lastSeen), isThinking: r.isThinking });
    }
    setPresenceMap(m);
  }

  return { presenceMap, setThinking };
}

function isOnline(lastSeen: string): boolean {
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}
