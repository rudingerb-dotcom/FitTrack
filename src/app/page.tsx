'use client'

import { useSession } from 'next-auth/react'
import { AuthScreen } from '@/components/fittrack/AuthScreen'
import { AppShell } from '@/components/fittrack/AppShell'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  return <AppShell />
}
