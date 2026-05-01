'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const dismissedRef = useRef<boolean | null>(null)

  useEffect(() => {
    // Initialize dismissal state from localStorage once
    if (dismissedRef.current === null) {
      dismissedRef.current = localStorage.getItem('fittrack-install-dismissed') === 'true'
    }

    // If already dismissed, don't listen for the prompt
    if (dismissedRef.current) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowBanner(false)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    dismissedRef.current = true
    localStorage.setItem('fittrack-install-dismissed', 'true')
  }

  if (!showBanner) return null

  return (
    <div className="bg-[#22c55e] px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Download className="w-5 h-5 text-[#050f09] shrink-0" />
        <span className="text-[#050f09] font-semibold text-sm truncate">
          Instalar FitTrack
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="bg-[#050f09] text-[#22c55e] text-sm font-bold px-4 py-1.5 rounded-lg hover:bg-[#0a1a0f] transition-colors"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="text-[#050f09]/60 hover:text-[#050f09] p-1 transition-colors"
          aria-label="Dismiss install banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
