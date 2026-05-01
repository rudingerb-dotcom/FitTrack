'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  Play,
  Copy,
  Dumbbell,
  ChevronUp,
  ChevronDown,
  X,
  Filter,
  ArrowLeft,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-helpers'

const MUSCLE_GROUPS = [
  'Pecho', 'Dorsales', 'Trapecio', 'Lumbares', 'Hombros',
  'Bíceps', 'Tríceps', 'Antebrazos', 'Cuádriceps',
  'Isquiotibiales', 'Gemelos', 'Abductores', 'Aductores',
  'Glúteos', 'Core',
]

const SET_TYPES = [
  { value: 'warmup', label: 'C', fullLabel: 'Calentamiento' },
  { value: 'normal', label: 'N', fullLabel: 'Normal' },
  { value: 'failure', label: 'F', fullLabel: 'Al fallo' },
] as const

type SetType = 'warmup' | 'normal' | 'failure'

interface Exercise {
  id: string
  name: string
  muscleGroup: string
  secondaryMuscle: string | null
  tertiaryMuscle: string | null
  equipment: string | null
  isDefault: boolean
}

interface RoutineSet {
  type: SetType
  weight: number
  reps: number
  rir: number
}

interface RoutineExerciseItem {
  exerciseId: string
  exercise?: Exercise
  order: number
  setsConfig: RoutineSet[]
}

interface Routine {
  id: string
  name: string
  description: string | null
  exercises: any[]
  createdAt: string
  updatedAt: string
}

interface RoutinesPageProps {
  onStartWorkout?: (routineId: string, routineName: string) => void
}

export function RoutinesPage({ onStartWorkout }: RoutinesPageProps) {
  const queryClient = useQueryClient()
  const [deletingRoutine, setDeletingRoutine] = useState<Routine | null>(null)
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null)

  // Fetch routines
  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['routines'],
    queryFn: () => apiGet<Routine[]>('/routines'),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/routines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] })
      toast.success('Rutina eliminada')
      setDeletingRoutine(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const copyRoutine = (routine: Routine) => {
    let text = `🏋️ ${routine.name}\n`
    if (routine.description) text += `${routine.description}\n`
    text += '\n'

    routine.exercises.forEach((re: any, i: number) => {
      const sets = Array.isArray(re.setsConfig) ? re.setsConfig : []
      text += `${i + 1}. ${re.exercise?.name || 'Ejercicio'}\n`
      sets.forEach((set: any, j: number) => {
        const typeLabel =
          set.type === 'warmup'
            ? 'C'
            : set.type === 'failure'
              ? 'F'
              : 'N'
        text += `   ${j + 1}. ${typeLabel} | ${set.weight}kg × ${set.reps} reps${set.type !== 'failure' && set.rir ? ` | RIR ${set.rir}` : ''}\n`
      })
      text += '\n'
    })

    navigator.clipboard.writeText(text).then(() => {
      toast.success('Rutina copiada al portapapeles')
    })
  }

  // If editing, show the editor
  if (editingRoutineId) {
    return (
      <RoutineEditor
        routineId={editingRoutineId}
        onClose={() => setEditingRoutineId(null)}
      />
    )
  }

  return (
    <div className="p-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Rutinas</h1>
        <Button
          onClick={() => setEditingRoutineId('new')}
          className="bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] h-11 px-4"
        >
          <Plus className="w-5 h-5 mr-1" />
          Nueva
        </Button>
      </div>

      {/* Routines list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : routines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Dumbbell className="w-12 h-12 mb-3 opacity-50" />
          <p>No tienes rutinas creadas</p>
          <p className="text-sm mt-1">Crea tu primera rutina para empezar</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {routines.map((routine) => (
            <div key={routine.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-semibold text-lg truncate">
                    {routine.name}
                  </p>
                  {routine.description && (
                    <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2">
                      {routine.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs">
                  {routine.exercises?.length || 0} ejercicios
                </Badge>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingRoutineId(routine.id)}
                  className="h-10 border-[#2a2a2a]"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyRoutine(routine)}
                  className="h-10 border-[#2a2a2a]"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copiar
                </Button>
                {onStartWorkout && (
                  <Button
                    size="sm"
                    onClick={() => onStartWorkout(routine.id, routine.name)}
                    className="h-10 bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09]"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Iniciar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingRoutine(routine)}
                  className="h-10 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingRoutine}
        onOpenChange={(open) => !open && setDeletingRoutine(null)}
      >
        <AlertDialogContent className="bg-[#141414] border-[#2a2a2a]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rutina?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{deletingRoutine?.name}&quot; permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2a2a2a]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingRoutine && deleteMutation.mutate(deletingRoutine.id)
              }
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Routine Editor (full screen) ────────────────────────────────────────────

function RoutineEditor({
  routineId,
  onClose,
}: {
  routineId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const isNew = routineId === 'new'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [addedExercises, setAddedExercises] = useState<RoutineExerciseItem[]>([])
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [loading, setLoading] = useState(!isNew)

  // Fetch exercises catalog
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => apiGet<Exercise[]>('/exercises'),
  })

  // Fetch routine if editing
  useQuery({
    queryKey: ['routine', routineId],
    queryFn: async () => {
      if (isNew) return null
      const routine = await apiGet<any>(`/routines/${routineId}`)
      setName(routine.name)
      setDescription(routine.description || '')
      setAddedExercises(
        routine.exercises.map((re: any) => ({
          exerciseId: re.exerciseId,
          exercise: re.exercise,
          order: re.order,
          setsConfig: Array.isArray(re.setsConfig)
            ? re.setsConfig
            : JSON.parse(re.setsConfig || '[]'),
        }))
      )
      setLoading(false)
      return routine
    },
    enabled: !isNew,
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        name,
        description: description || null,
        exercises: addedExercises.map((ex, i) => ({
          exerciseId: ex.exerciseId,
          order: i,
          setsConfig: ex.setsConfig,
        })),
      }

      if (isNew) {
        return apiPost('/routines', data)
      } else {
        return apiPut(`/routines/${routineId}`, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] })
      toast.success(isNew ? 'Rutina creada' : 'Rutina actualizada')
      onClose()
    },
    onError: (err: any) => toast.error(err.message),
  })

  const addExercise = (exercise: Exercise) => {
    setAddedExercises((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        exercise,
        order: prev.length,
        setsConfig: [{ type: 'normal' as SetType, weight: 0, reps: 0, rir: 0 }],
      },
    ])
  }

  const removeExercise = (index: number) => {
    setAddedExercises((prev) => prev.filter((_, i) => i !== index))
  }

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    setAddedExercises((prev) => {
      const next = [...prev]
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= next.length) return prev
      ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
      return next
    })
  }

  const addSet = (exerciseIndex: number) => {
    setAddedExercises((prev) =>
      prev.map((ex, i) =>
        i === exerciseIndex
          ? {
              ...ex,
              setsConfig: [
                ...ex.setsConfig,
                { type: 'normal' as SetType, weight: 0, reps: 0, rir: 0 },
              ],
            }
          : ex
      )
    )
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setAddedExercises((prev) =>
      prev.map((ex, i) =>
        i === exerciseIndex
          ? { ...ex, setsConfig: ex.setsConfig.filter((_, j) => j !== setIndex) }
          : ex
      )
    )
  }

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof RoutineSet,
    value: any
  ) => {
    setAddedExercises((prev) =>
      prev.map((ex, i) =>
        i === exerciseIndex
          ? {
              ...ex,
              setsConfig: ex.setsConfig.map((s, j) =>
                j === setIndex ? { ...s, [field]: value } : s
              ),
            }
          : ex
      )
    )
  }

  // Filter available exercises
  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name
      .toLowerCase()
      .includes(exerciseSearch.toLowerCase())
    const matchesMuscle =
      !muscleFilter || ex.muscleGroup === muscleFilter
    return matchesSearch && matchesMuscle
  })

  // Sort by popularity (default exercises first, then alphabetical)
  const sortedExercises = [...filteredExercises].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    return a.name.localeCompare(b.name)
  })

  const popularExercises = sortedExercises.filter((e) => e.isDefault)
  const customExercises = sortedExercises.filter((e) => !e.isDefault)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a] border-b border-[#2a2a2a] p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-11 w-11"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">
            {isNew ? 'Nueva Rutina' : 'Editar Rutina'}
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          <Input
            placeholder="Nombre de la rutina"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 text-lg bg-[#141414] border-[#2a2a2a]"
          />
          <Textarea
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-[#141414] border-[#2a2a2a] min-h-[60px]"
            rows={2}
          />
        </div>
      </div>

      {/* Added exercises list */}
      <div className="p-4" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
        {addedExercises.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 text-sm">
            Añade ejercicios a tu rutina
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {addedExercises.map((ex, exIndex) => (
              <div key={exIndex} className="glass-card rounded-xl p-3">
                {/* Exercise header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-muted-foreground text-sm font-mono">
                      {exIndex + 1}.
                    </span>
                    <p className="text-foreground font-semibold truncate">
                      {ex.exercise?.name || 'Ejercicio'}
                    </p>
                    <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 text-xs shrink-0">
                      {ex.exercise?.muscleGroup || ''}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveExercise(exIndex, 'up')}
                      disabled={exIndex === 0}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveExercise(exIndex, 'down')}
                      disabled={exIndex === addedExercises.length - 1}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeExercise(exIndex)}
                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sets */}
                <div className="flex flex-col gap-1.5">
                  {/* Header row */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
                    <span className="w-8 text-center">#</span>
                    <span className="w-10 text-center">Tipo</span>
                    <span className="flex-1 text-center">Peso</span>
                    <span className="flex-1 text-center">Reps</span>
                    <span className="flex-1 text-center">RIR</span>
                    <span className="w-8" />
                  </div>

                  {ex.setsConfig.map((set, setIndex) => (
                    <div
                      key={setIndex}
                      className="flex items-center gap-1"
                    >
                      <span className="w-8 text-center text-sm text-muted-foreground">
                        {setIndex + 1}
                      </span>

                      {/* Type selector */}
                      <div className="flex w-10">
                        {SET_TYPES.map((st) => (
                          <button
                            key={st.value}
                            onClick={() =>
                              updateSet(exIndex, setIndex, 'type', st.value)
                            }
                            className={`w-[22px] h-8 flex items-center justify-center text-xs font-bold rounded transition-colors ${
                              set.type === st.value
                                ? st.value === 'warmup'
                                  ? 'bg-orange-500/20 text-orange-400'
                                  : st.value === 'failure'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-[#22c55e]/20 text-[#22c55e]'
                                : 'text-muted-foreground/50 hover:bg-[#2a2a2a]'
                            }`}
                            title={st.fullLabel}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      <Input
                        type="number"
                        placeholder="kg"
                        value={set.weight || ''}
                        onChange={(e) =>
                          updateSet(
                            exIndex,
                            setIndex,
                            'weight',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="flex-1 h-8 text-sm text-center bg-[#0a0a0a] border-[#2a2a2a] px-1"
                      />
                      <Input
                        type="number"
                        placeholder="reps"
                        value={set.reps || ''}
                        onChange={(e) =>
                          updateSet(
                            exIndex,
                            setIndex,
                            'reps',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="flex-1 h-8 text-sm text-center bg-[#0a0a0a] border-[#2a2a2a] px-1"
                      />
                      <Input
                        type="number"
                        placeholder="rir"
                        value={set.type !== 'failure' ? set.rir || '' : ''}
                        disabled={set.type === 'failure'}
                        onChange={(e) =>
                          updateSet(
                            exIndex,
                            setIndex,
                            'rir',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="flex-1 h-8 text-sm text-center bg-[#0a0a0a] border-[#2a2a2a] px-1 disabled:opacity-30"
                      />
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
                    className="text-[#22c55e] text-xs font-medium py-1.5 hover:bg-[#22c55e]/5 rounded"
                  >
                    + Añadir serie
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exercise search/add section */}
      <div className="flex-1 border-t border-[#2a2a2a] p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Añadir ejercicio
        </h3>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ejercicio..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="h-10 pl-9 text-sm bg-[#141414] border-[#2a2a2a]"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilter(!showFilter)}
            className={`h-10 w-10 border-[#2a2a2a] ${muscleFilter ? 'bg-[#22c55e]/10 border-[#22c55e]/30' : 'bg-[#141414]'}`}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {showFilter && (
          <div className="mb-3 glass-card rounded-lg p-2">
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map((muscle) => (
                <button
                  key={muscle}
                  onClick={() =>
                    setMuscleFilter(muscleFilter === muscle ? '' : muscle)
                  }
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    muscleFilter === muscle
                      ? 'bg-[#22c55e] text-[#050f09]'
                      : 'bg-[#1a1a1a] text-muted-foreground hover:bg-[#2a2a2a]'
                  }`}
                >
                  {muscle}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-h-48 overflow-y-auto scroll-container">
          {popularExercises.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5 px-1">
                <Star className="w-3 h-3" /> Populares
              </p>
              {popularExercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#22c55e]/5 text-left transition-colors"
                >
                  <Plus className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">
                    {ex.name}
                  </span>
                  <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 text-[10px] shrink-0">
                    {ex.muscleGroup}
                  </Badge>
                </button>
              ))}
            </>
          )}

          {customExercises.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground mt-2 mb-1.5 px-1">
                Personalizados
              </p>
              {customExercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#22c55e]/5 text-left transition-colors"
                >
                  <Plus className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">
                    {ex.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {ex.muscleGroup}
                  </Badge>
                </button>
              ))}
            </>
          )}

          {filteredExercises.length === 0 && (
            <p className="text-muted-foreground text-center py-4 text-sm">
              No se encontraron ejercicios
            </p>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="sticky bottom-0 p-4 bg-[#0a0a0a] border-t border-[#2a2a2a]">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || saveMutation.isPending}
          className="w-full h-14 text-lg font-semibold bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] green-glow rounded-xl"
        >
          {saveMutation.isPending ? 'Guardando...' : 'Guardar Rutina'}
        </Button>
      </div>
    </div>
  )
}
