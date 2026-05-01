'use client'

import { useState, useEffect, useRef } from 'react'
import { Dumbbell, List, Plus, Clock, User, LogOut, TrendingUp, MessageCircle, Users } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { ExercisesPage } from './ExercisesPage'
import { RoutinesPage } from './RoutinesPage'
import { ActiveWorkoutPage } from './ActiveWorkoutPage'
import { HistoryPage } from './HistoryPage'
import { ProgressPage } from './ProgressPage'
import { AIChatPage } from './AIChatPage'
import { ProfilePage } from './ProfilePage'
import { SocialPage } from './SocialPage'
import { InstallBanner } from './InstallBanner'
import { apiGet } from '@/lib/api-helpers'

type Tab = 'routines' | 'exercises' | 'start' | 'history' | 'profile'
type SubPage = 'progress' | 'ai-chat' | 'social' | null

interface ActiveWorkout {
  id: string
  name: string
  routineId?: string | null
  routine?: { id: string; name: string } | null
  exercises: any[]
  startedAt: string
}

interface AppShellProps {
  onLogout?: () => void
}

export function AppShell({ onLogout }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>('routines')
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null)
  const [showStartDialog, setShowStartDialog] = useState(false)
  const [activeSubPage, setActiveSubPage] = useState<SubPage>(null)
  const { data: session } = useSession()
  const mountRef = useRef(false)

  // Check for active workout + localStorage on mount
  useEffect(() => {
    if (mountRef.current) return
    mountRef.current = true

    // First check localStorage
    let localWorkout: ActiveWorkout | null = null
    const saved = localStorage.getItem('fittrack-active-workout')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.exercises) {
          localWorkout = {
            id: parsed.workoutId || 'local',
            name: parsed.routineName || 'Entreno libre',
            routineId: parsed.routineId || null,
            exercises: parsed.exercises || [],
            startedAt: parsed.startedAt || new Date().toISOString(),
          }
        }
      } catch {
        // ignore
      }
    }

    // Then check API
    const checkActiveWorkout = async () => {
      try {
        const workout = await apiGet<ActiveWorkout | null>('/workouts/active')
        if (workout) {
          setActiveWorkout(workout)
        } else if (localWorkout) {
          setActiveWorkout(localWorkout)
        }
      } catch {
        if (localWorkout) {
          setActiveWorkout(localWorkout)
        }
      }
    }
    checkActiveWorkout()
  }, [])

  const handleTabClick = (tab: Tab) => {
    if (tab === 'start') {
      if (activeWorkout) {
        setActiveTab('start')
      } else {
        setShowStartDialog(true)
      }
      return
    }
    setActiveTab(tab)
    // Clear sub-page when switching tabs
    setActiveSubPage(null)
  }

  const handleStartWorkout = (routineId?: string, routineName?: string) => {
    setShowStartDialog(false)
    // The ActiveWorkoutPage will handle creating the workout
    setActiveWorkout({
      id: 'new',
      name: routineName || 'Entreno libre',
      routineId: routineId || null,
      exercises: [],
      startedAt: new Date().toISOString(),
    })
    setActiveTab('start')
  }

  const handleWorkoutFinish = () => {
    setActiveWorkout(null)
    setActiveTab('history')
  }

  const handleWorkoutCancel = () => {
    setActiveWorkout(null)
    setActiveTab('routines')
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    onLogout?.()
  }

  const handleSubPageNavigate = (page: string) => {
    setActiveSubPage(page as SubPage)
  }

  const handleSubPageBack = () => {
    setActiveSubPage(null)
  }

  const tabs: { id: Tab; icon: typeof Dumbbell; label: string }[] = [
    { id: 'routines', icon: Dumbbell, label: 'Rutinas' },
    { id: 'exercises', icon: List, label: 'Ejercicios' },
    { id: 'start', icon: Plus, label: 'START' },
    { id: 'history', icon: Clock, label: 'Historial' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ]

  // If a sub-page is active, show it full-screen (no bottom nav)
  if (activeSubPage) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
        {activeSubPage === 'progress' && (
          <ProgressPage onBack={handleSubPageBack} />
        )}
        {activeSubPage === 'ai-chat' && (
          <AIChatPage onBack={handleSubPageBack} />
        )}
        {activeSubPage === 'social' && (
          <SocialPage onBack={handleSubPageBack} />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <InstallBanner />
      {/* Main content */}
      <main className="flex-1 pb-nav">
        {activeTab === 'routines' && (
          <RoutinesPage onStartWorkout={handleStartWorkout} />
        )}
        {activeTab === 'exercises' && <ExercisesPage />}
        {activeTab === 'start' && activeWorkout && (
          <ActiveWorkoutPage
            workout={activeWorkout}
            onFinish={handleWorkoutFinish}
            onCancel={handleWorkoutCancel}
          />
        )}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'profile' && (
          <ProfilePage
            onNavigate={handleSubPageNavigate}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        {tabs.map((tab) => {
          const isStart = tab.id === 'start'
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                bottom-nav-item relative
                ${isActive ? 'active' : ''}
                ${isStart ? '!min-w-[72px]' : ''}
              `}
            >
              {isStart ? (
                <div
                  className={`
                    w-14 h-14 rounded-2xl flex items-center justify-center
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-[#22c55e] green-glow-strong shadow-lg'
                        : activeWorkout
                          ? 'bg-[#22c55e]/20 border border-[#22c55e]/40'
                          : 'bg-[#22c55e]/10 border border-[#22c55e]/20'
                    }
                  `}
                >
                  <Plus
                    className={`w-7 h-7 ${isActive ? 'text-[#050f09]' : 'text-[#22c55e]'}`}
                  />
                </div>
              ) : (
                <Icon className="w-6 h-6" />
              )}
              {!isStart && (
                <span className="bottom-nav-label">{tab.label}</span>
              )}
              {isStart && (
                <span className="text-[10px] font-bold text-[#22c55e] mt-0.5">
                  {activeWorkout ? 'ACTIVO' : 'START'}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Start Workout Dialog */}
      {showStartDialog && (
        <StartWorkoutDialog
          onSelectRoutine={handleStartWorkout}
          onStartEmpty={() => handleStartWorkout()}
          onClose={() => setShowStartDialog(false)}
        />
      )}
    </div>
  )
}

// ─── Start Workout Dialog ────────────────────────────────────────────────────

function StartWorkoutDialog({
  onSelectRoutine,
  onStartEmpty,
  onClose,
}: {
  onSelectRoutine: (id: string, name: string) => void
  onStartEmpty: () => void
  onClose: () => void
}) {
  const [routines, setRoutines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<any[]>('/routines')
      .then(setRoutines)
      .catch(() => setRoutines([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[#141414] rounded-t-2xl border-t border-[#2a2a2a] p-6 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">
            Iniciar Entrenamiento
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2"
          >
            ✕
          </button>
        </div>

        {/* Start empty button */}
        <button
          onClick={onStartEmpty}
          className="w-full glass-card rounded-xl p-4 mb-4 flex items-center gap-3 hover:bg-[#22c55e]/5 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
            <Plus className="w-6 h-6 text-[#22c55e]" />
          </div>
          <div className="text-left">
            <p className="text-foreground font-semibold text-lg">
              Entreno libre
            </p>
            <p className="text-muted-foreground text-sm">
              Sin rutina predefinida
            </p>
          </div>
        </button>

        {/* Routines list */}
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Tus Rutinas
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : routines.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            No tienes rutinas creadas aún
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {routines.map((routine) => (
              <button
                key={routine.id}
                onClick={() => onSelectRoutine(routine.id, routine.name)}
                className="w-full glass-card rounded-xl p-4 flex items-center gap-3 hover:bg-[#22c55e]/5 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1a2e1a] flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-[#4ade80]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-semibold truncate">
                    {routine.name}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {routine.exercises?.length || 0} ejercicios
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
