import { useTrackerStore } from "@/stores/trackerStore"
import { useAuthStore } from "@/stores/authStore"

const EMOJIS = ["👍", "🎉", "😱", "💀", "🔥", "😂"]

export function useReactions(_gameId: string | null) {
  const { myPlayerId, recentReactions, sendReaction } = useTrackerStore()
  const { userId } = useAuthStore()

  async function react(emoji: string) {
    if (!myPlayerId || !userId) return
    await sendReaction(myPlayerId, emoji)
  }

  return { recentReactions, react, EMOJIS }
}
