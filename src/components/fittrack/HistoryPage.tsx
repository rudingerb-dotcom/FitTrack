'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, Dumbbell, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { apiGet } from '@/lib/api-helpers'

interface WorkoutSet {
  id: string
  type: string
  weight: number
  reps: number
  rir: number
  completed: boolean
}

interface WorkoutExercise {
  id: string
  exerciseId: string
  order: number
  exercise: {
    id: string
    name: string
    muscleGroup: string
  }
  sets: WorkoutSet[]
}

interface Workout {
  id: string
  name: string
  routineId: string | null
  startedAt: string
  completedAt: string | null
  duration: number
  routine: { id: string; name: string } | null
  exercises: WorkoutExercise[]
}

interface HistoryPageProps {
  onNavigate?: (page: string) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Hoy'
  if (isYesterday(date)) return 'Ayer'
  if (isThisWeek(date)) {
    return format(date, "EEEE d 'de' MMMM", { locale: es })
  }
  if (isThisYear(date)) {
    return format(date, "d 'de' MMMM", { locale: es })
  }
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: es })
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

const setTypeLabel = (type: string) => {
  switch (type) {
    case 'warmup':
      return 'C'
    case 'failure':
      return 'F'
    default:
      return 'N'
  }
}

const setTypeColor = (type: string) => {
  switch (type) {
    case 'warmup':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'failure':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    default:
      return 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30'
  }
}

export function HistoryPage({ onNavigate }: HistoryPageProps) {
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => apiGet<Workout[]>('/workouts'),
  })

  // Group workouts by date
  const groupedWorkouts: Record<string, Workout[]> = {}
  workouts.forEach((workout) => {
    const dateKey = workout.completedAt
      ? formatDate(workout.completedAt)
      : 'Sin fecha'
    if (!groupedWorkouts[dateKey]) groupedWorkouts[dateKey] = []
    groupedWorkouts[dateKey].push(workout)
  })

  return (
    <div className="p-4 pt-6">
      <h1 className="text-2xl font-bold mb-4">Historial</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : workouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Calendar className="w-12 h-12 mb-3 opacity-50" />
          <p>No hay entrenamientos registrados</p>
          <p className="text-sm mt-1">
            Completa tu primer entreno para verlo aquí
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groupedWorkouts).map(([dateKey, dateWorkouts]) => (
            <div key={dateKey}>
              {/* Date header */}
              <h2 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                {dateKey}
              </h2>

              <div className="flex flex-col gap-2">
                {dateWorkouts.map((workout) => {
                  const isExpanded = expandedWorkout === workout.id

                  return (
                    <div key={workout.id} className="glass-card rounded-xl overflow-hidden">
                      {/* Workout card header */}
                      <button
                        onClick={() =>
                          setExpandedWorkout(isExpanded ? null : workout.id)
                        }
                        className="w-full p-4 flex items-center gap-3 text-left"
                      >
                        <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 flex items-center justify-center shrink-0">
                          <Dumbbell className="w-6 h-6 text-[#22c55e]" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-semibold truncate">
                            {workout.routine?.name || workout.name || 'Entreno libre'}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-muted-foreground text-sm flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDuration(workout.duration)}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {workout.exercises.length} ejercicios
                            </span>
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-[#2a2a2a] pt-3">
                          {workout.exercises.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-4">
                              Sin ejercicios registrados
                            </p>
                          ) : (
                            <div className="flex flex-col gap-3">
                              {workout.exercises.map((ex, i) => (
                                <div key={ex.id}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-muted-foreground text-xs font-mono">
                                      {i + 1}.
                                    </span>
                                    <span className="text-foreground font-medium text-sm">
                                      {ex.exercise?.name || 'Ejercicio'}
                                    </span>
                                    {ex.exercise?.muscleGroup && (
                                      <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 text-[10px] shrink-0">
                                        {ex.exercise.muscleGroup}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-0.5 ml-5">
                                    {ex.sets.map((set, j) => (
                                      <div
                                        key={set.id}
                                        className="flex items-center gap-2 text-sm py-0.5"
                                      >
                                        <span className="text-muted-foreground w-5 text-center text-xs">
                                          {j + 1}
                                        </span>
                                        <Badge
                                          className={`${setTypeColor(set.type)} text-[10px] px-1 py-0`}
                                        >
                                          {setTypeLabel(set.type)}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                          {set.weight}kg × {set.reps} reps
                                        </span>
                                        {set.type !== 'failure' &&
                                          set.rir > 0 && (
                                            <span className="text-muted-foreground text-xs">
                                              RIR {set.rir}
                                            </span>
                                          )}
                                        {set.completed && (
                                          <span className="text-[#22c55e] text-xs">
                                            ✓
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
