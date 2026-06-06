import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import HomePage from '@/pages/HomePage'
import SetupPage from '@/pages/SetupPage'
import GamePage from '@/pages/GamePage'
import LibraryPage from '@/pages/LibraryPage'
import CreateSetPage from '@/pages/CreateSetPage'

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/game/:gameId" element={<GamePage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/library/create" element={<CreateSetPage />} />
    </Routes>
  )
}
