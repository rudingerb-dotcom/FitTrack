'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Plus,
  Check,
  Search,
  Filter,
  ArrowLeft,
  Clock,
  Dumbbell,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { apiGet, apiPost, apiDelete } from '@/lib/api-helpers'

const MUSCLE_GROUPS = [
  'Pecho', 'Dorsales', 'Trapecio', 'Lumbares', 'Hombros',
  'Bíceps', 'Tríceps', 'Antebrazos', 'Cuádriceps',
  'Isquiotibiales', 'Gemelos', 'Abductores', 'Aductores',
  'Glúteos', 'Core',
]

const STORAGE_KEY = 'fittrack-active-workout'

type SetType = 'warmup' | 'normal' | 'failure'

interface WorkoutSet {
  id?: string
  type: SetType
  weight: number
  reps: number
  rir: number
  completed: boolean
}

interface WorkoutExercise {
  exerciseId: string
  exercise?: {
    id: string
    name: string
    muscleGroup: string
  }
  order: number
  sets: WorkoutSet[]
}

interface PersistedWorkout {
  workoutId?: string
  routineId?: string | null
  routineName?: string
  name: string
  startedAt: string
  timerSeconds: number
  exercises: WorkoutExercise[]
}

interface ActiveWorkoutPageProps {
  workout: {
    id: string
    name: string
    routineId?: string | null
    exercises: any[]
    startedAt: string
  }
  onFinish: () => void
  onCancel: () => void
}

export function ActiveWorkoutPage({
  workout,
  onFinish,
  onCancel,
}: ActiveWorkoutPageProps) {
  const queryClient = useQueryClient()
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [workoutId, setWorkoutId] = useState<string | null>(
    workout.id !== 'new' ? workout.id : null
  )
  const [isFinishing, setIsFinishing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initializedRef = useRef(false)

  // Initialize from localStorage or workout data
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed: PersistedWorkout = JSON.parse(saved)
        setExercises(parsed.exercises || [])
        setTimerSeconds(parsed.timerSeconds || 0)
        if (parsed.workoutId) setWorkoutId(parsed.workoutId)
        return
      } catch {
        // fall through
      }
    }

    // Initialize from workout prop
    if (workout.exercises && workout.exercises.length > 0) {
      const mapped: WorkoutExercise[] = workout.exercises.map(
        (ex: any, i: number) => ({
          exerciseId: ex.exerciseId,
          exercise: ex.exercise,
          order: i,
          sets: ex.sets?.map((s: any) => ({
            id: s.id,
            type: s.type || 'normal',
            weight: s.weight || 0,
            reps: s.reps || 0,
            rir: s.rir || 0,
            completed: s.completed || false,
          })) || [{ type: 'normal', weight: 0, reps: 0, rir: 0, completed: false }],
        })
      )
      setExercises(mapped)
    }

    // Create the workout in the API if new
    if (workout.id === 'new' && !workoutId) {
      createWorkoutInApi()
    }
  }, [])

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => prev + 1)
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Save to localStorage on every change + every second
  const saveToLocalStorage = useCallback(() => {
    const data: PersistedWorkout = {
      workoutId: workoutId || undefined,
      routineId: workout.routineId || null,
      routineName: workout.name,
      name: workout.name,
      startedAt: workout.startedAt,
      timerSeconds,
      exercises,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [workoutId, workout, timerSeconds, exercises])

  // Auto-save on timer tick
  useEffect(() => {
    saveToLocalStorage()
  }, [timerSeconds, saveToLocalStorage])

  // Create workout in API
  const createWorkoutInApi = async () => {
    try {
      const result = await apiPost<any>('/workouts/active', {
        routineId: workout.routineId || undefined,
        name: workout.name,
      })
      setWorkoutId(result.id)
      // Update exercises from API response (may have pre-populated sets)
      if (result.exercises && result.exercises.length > 0) {
        setExercises(
          result.exercises.map((ex: any, i: number) => ({
            exerciseId: ex.exerciseId,
            exercise: ex.exercise,
            order: i,
            sets: ex.sets?.map((s: any) => ({
              id: s.id,
              type: s.type || 'normal',
              weight: s.weight || 0,
              reps: s.reps || 0,
              rir: s.rir || 0,
              completed: s.completed || false,
            })) || [],
          }))
        )
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Finish workout
  const handleFinish = async () => {
    setIsFinishing(true)
    try {
      const payload = {
        routineId: workout.routineId || undefined,
        name: workout.name,
        duration: timerSeconds,
        exercises: exercises.map((ex, i) => ({
          exerciseId: ex.exerciseId,
          order: i,
          sets: ex.sets.map((s) => ({
            type: s.type,
            weight: s.weight,
            reps: s.reps,
            rir: s.rir,
            completed: s.completed,
          })),
        })),
      }

      await apiPost('/workouts', payload)
      localStorage.removeItem(STORAGE_KEY)
      toast.success('¡Entrenamiento guardado!')
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      onFinish()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar entrenamiento')
    } finally {
      setIsFinishing(false)
    }
  }

  // Cancel workout
  const handleCancel = async () => {
    try {
      if (workoutId) {
        await apiDelete('/workouts/active')
      }
      localStorage.removeItem(STORAGE_KEY)
      toast('Entrenamiento cancelado')
      onCancel()
    } catch (err: any) {
      // Even if API fails, clear localStorage
      localStorage.removeItem(STORAGE_KEY)
      onCancel()
    }
  }

  // Toggle set completion
  const toggleSetComplete = (exIndex: number, setIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j === setIndex ? { ...s, completed: !s.completed } : s
              ),
            }
          : ex
      )
    )
  }

  // Update set field
  const updateSet = (
    exIndex: number,
    setIndex: number,
    field: keyof WorkoutSet,
    value: any
  ) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j === setIndex ? { ...s, [field]: value } : s
              ),
            }
          : ex
      )
    )
  }

  // Add set to exercise
  const addSet = (exIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                { type: 'normal', weight: 0, reps: 0, rir: 0, completed: false },
              ],
            }
          : ex
      )
    )
  }

  // Remove set from exercise
  const removeSet = (exIndex: number, setIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) }
          : ex
      )
    )
  }

  // Add exercise to workout
  const addExerciseToWorkout = (exercise: any) => {
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        exercise,
        order: prev.length,
        sets: [{ type: 'normal', weight: 0, reps: 0, rir: 0, completed: false }],
      },
    ])
    setShowAddExercise(false)
  }

  // Remove exercise from workout
  const removeExercise = (exIndex: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIndex))
  }

  // Format timer
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const setTypeBadge = (type: SetType) => {
    switch (type) {
      case 'warmup':
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs px-1.5">
            C
          </Badge>
        )
      case 'failure':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs px-1.5">
            F
          </Badge>
        )
      default:
        return (
          <Badge className="bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30 text-xs px-1.5">
            N
          </Badge>
        )
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header with timer */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a] border-b border-[#2a2a2a] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{workout.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-5 h-5 text-[#22c55e]" />
              <span className="text-2xl font-bold font-mono text-[#22c55e]">
                {formatTime(timerSeconds)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowCancelDialog(true)}
              className="text-destructive hover:bg-destructive/10 h-11"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto scroll-container">
        {exercises.map((ex, exIndex) => (
          <div key={exIndex} className="glass-card rounded-xl p-4">
            {/* Exercise header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-muted-foreground text-sm font-mono">
                  {exIndex + 1}.
                </span>
                <h3 className="text-foreground font-bold text-lg truncate">
                  {ex.exercise?.name || 'Ejercicio'}
                </h3>
                {ex.exercise?.muscleGroup && (
                  <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 text-xs shrink-0">
                    {ex.exercise.muscleGroup}
                  </Badge>
                )}
              </div>
              <button
                onClick={() => removeExercise(exIndex)}
                className="p-2 text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sets */}
            <div className="flex flex-col gap-2">
              {/* Column headers */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <span className="w-8 text-center">Set</span>
                <span className="w-10 text-center">Tipo</span>
                <span className="flex-1 text-center">Peso (kg)</span>
                <span className="flex-1 text-center">Reps</span>
                <span className="w-12 text-center">RIR</span>
                <span className="w-12 text-center">✓</span>
                <span className="w-8" />
              </div>

              {ex.sets.map((set, setIndex) => (
                <div
                  key={setIndex}
                  className={`flex items-center gap-2 transition-opacity ${
                    set.completed ? 'opacity-50' : ''
                  }`}
                >
                  <span
                    className={`w-8 text-center text-sm font-medium ${
                      set.completed
                        ? 'line-through text-muted-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {setIndex + 1}
                  </span>

                  {/* Type toggle */}
                  <div className="flex w-10 gap-0.5">
                    {(['warmup', 'normal', 'failure'] as SetType[]).map(
                      (t) => (
                        <button
                          key={t}
                          onClick={() =>
                            updateSet(exIndex, setIndex, 'type', t)
                          }
                          className={`w-[18px] h-9 flex items-center justify-center text-[10px] font-bold rounded transition-colors ${
                            set.type === t
                              ? t === 'warmup'
                                ? 'bg-orange-500/20 text-orange-400'
                                : t === 'failure'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-[#22c55e]/20 text-[#22c55e]'
                              : 'text-muted-foreground/40 hover:bg-[#2a2a2a]'
                          }`}
                        >
                          {t === 'warmup'
                            ? 'C'
                            : t === 'failure'
                              ? 'F'
                              : 'N'}
                        </button>
                      )
                    )}
                  </div>

                  <Input
                    type="number"
                    placeholder="0"
                    value={set.weight || ''}
                    onChange={(e) =>
                      updateSet(
                        exIndex,
                        setIndex,
                        'weight',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className={`flex-1 h-11 text-base text-center bg-[#0a0a0a] border-[#2a2a2a] px-1 ${
                      set.completed ? 'line-through' : ''
                    }`}
                  />
                  <Input
                    type="number"
                    placeholder="0"
                    value={set.reps || ''}
                    onChange={(e) =>
                      updateSet(
                        exIndex,
                        setIndex,
                        'reps',
                        parseInt(e.target.value) || 0
                      )
                    }
                    className={`flex-1 h-11 text-base text-center bg-[#0a0a0a] border-[#2a2a2a] px-1 ${
                      set.completed ? 'line-through' : ''
                    }`}
                  />
                  <span className="w-12 text-center text-sm text-muted-foreground">
                    {set.type !== 'failure' ? set.rir || '-' : '—'}
                  </span>

                  {/* Completion checkbox */}
                  <button
                    onClick={() => toggleSetComplete(exIndex, setIndex)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      set.completed
                        ? 'bg-[#22c55e] text-[#050f09] green-glow'
                        : 'bg-[#1a1a1a] border-2 border-[#2a2a2a] text-muted-foreground hover:border-[#22c55e]/50'
                    }`}
                  >
                    <Check className="w-6 h-6" />
                  </button>

                  <button
                    onClick={() => removeSet(exIndex, setIndex)}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => addSet(exIndex)}
                className="text-[#22c55e] text-sm font-medium py-2 hover:bg-[#22c55e]/5 rounded-lg"
              >
                + Añadir serie
              </button>
            </div>
          </div>
        ))}

        {/* Add exercise button */}
        <button
          onClick={() => setShowAddExercise(true)}
          className="glass-card rounded-xl p-4 flex items-center justify-center gap-2 text-[#22c55e] hover:bg-[#22c55e]/5 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Añadir ejercicio</span>
        </button>
      </div>

      {/* Finish button */}
      <div className="sticky bottom-0 p-4 bg-[#0a0a0a] border-t border-[#2a2a2a]">
        <Button
          onClick={handleFinish}
          disabled={isFinishing}
          className="w-full h-14 text-lg font-semibold bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] green-glow-strong rounded-xl"
        >
          {isFinishing ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : null}
          Finalizar Entrenamiento
        </Button>
      </div>

      {/* Cancel dialog */}
      <AlertDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
      >
        <AlertDialogContent className="bg-[#141414] border-[#2a2a2a]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar entrenamiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se perderá todo el progreso de este entrenamiento. Esta acción no
              se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2a2a2a]">
              Continuar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive hover:bg-destructive/90"
            >
              Cancelar Entreno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add exercise modal */}
      {showAddExercise && (
        <AddExerciseModal
          onSelect={addExerciseToWorkout}
          onClose={() => setShowAddExercise(false)}
        />
      )}
    </div>
  )
}

// ─── Add Exercise Modal ──────────────────────────────────────────────────────

function AddExerciseModal({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: any) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => apiGet<any[]>('/exercises'),
  })

  const filtered = exercises.filter((ex: any) => {
    const matchesSearch = ex.name
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesMuscle =
      !muscleFilter || ex.muscleGroup === muscleFilter
    return matchesSearch && matchesMuscle
  })

  const popular = filtered.filter((e: any) => e.isDefault)
  const custom = filtered.filter((e: any) => !e.isDefault)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#141414] rounded-t-2xl border-t border-[#2a2a2a] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Añadir Ejercicio</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground p-2 hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9 text-sm bg-[#0a0a0a] border-[#2a2a2a]"
                autoFocus
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilter(!showFilter)}
              className={`h-10 w-10 border-[#2a2a2a] ${muscleFilter ? 'bg-[#22c55e]/10 border-[#22c55e]/30' : 'bg-[#0a0a0a]'}`}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {showFilter && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    setMuscleFilter(muscleFilter === m ? '' : m)
                  }
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    muscleFilter === m
                      ? 'bg-[#22c55e] text-[#050f09]'
                      : 'bg-[#1a1a1a] text-muted-foreground'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 scroll-container">
          {popular.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                ⭐ Populares
              </p>
              {popular.map((ex: any) => (
                <button
                  key={ex.id}
                  onClick={() => onSelect(ex)}
                  className="w-full flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-[#22c55e]/5 text-left transition-colors"
                >
                  <Plus className="w-5 h-5 text-[#22c55e] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ex.name}</p>
                  </div>
                  <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 text-xs shrink-0">
                    {ex.muscleGroup}
                  </Badge>
                </button>
              ))}
            </>
          )}

          {custom.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground mt-3 mb-2">
                Personalizados
              </p>
              {custom.map((ex: any) => (
                <button
                  key={ex.id}
                  onClick={() => onSelect(ex)}
                  className="w-full flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-[#22c55e]/5 text-left transition-colors"
                >
                  <Plus className="w-5 h-5 text-[#22c55e] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ex.name}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {ex.muscleGroup}
                  </Badge>
                </button>
              ))}
            </>
          )}

          {filtered.length === 0 && (
            <p className="text-muted-foreground text-center py-8 text-sm">
              No se encontraron ejercicios
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
