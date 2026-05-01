'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Trash2, Pencil, Dumbbell, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-helpers'

const MUSCLE_GROUPS = [
  'Pecho',
  'Dorsales',
  'Trapecio',
  'Lumbares',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Antebrazos',
  'Cuádriceps',
  'Isquiotibiales',
  'Gemelos',
  'Abductores',
  'Aductores',
  'Glúteos',
  'Core',
]

interface Exercise {
  id: string
  name: string
  muscleGroup: string
  secondaryMuscle: string | null
  tertiaryMuscle: string | null
  equipment: string | null
  isDefault: boolean
}

interface ExercisesPageProps {
  onNavigate?: (page: string) => void
}

export function ExercisesPage({ onNavigate }: ExercisesPageProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string>('')
  const [showFilter, setShowFilter] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formMuscle, setFormMuscle] = useState('')
  const [formSecondary, setFormSecondary] = useState('')
  const [formTertiary, setFormTertiary] = useState('')
  const [formEquipment, setFormEquipment] = useState('')

  // Fetch exercises
  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => apiGet<Exercise[]>('/exercises'),
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost('/exercises', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success('Ejercicio creado')
      resetForm()
      setShowCreateDialog(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiPut(`/exercises/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success('Ejercicio actualizado')
      resetForm()
      setEditingExercise(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/exercises/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success('Ejercicio eliminado')
      setDeletingExercise(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const resetForm = () => {
    setFormName('')
    setFormMuscle('')
    setFormSecondary('')
    setFormTertiary('')
    setFormEquipment('')
  }

  const handleEdit = (exercise: Exercise) => {
    setFormName(exercise.name)
    setFormMuscle(exercise.muscleGroup)
    setFormSecondary(exercise.secondaryMuscle || '')
    setFormTertiary(exercise.tertiaryMuscle || '')
    setFormEquipment(exercise.equipment || '')
    setEditingExercise(exercise)
  }

  const handleSubmit = () => {
    if (!formName.trim() || !formMuscle) {
      toast.error('Nombre y grupo muscular son requeridos')
      return
    }

    const data = {
      name: formName.trim(),
      muscleGroup: formMuscle,
      secondaryMuscle: formSecondary || null,
      tertiaryMuscle: formTertiary || null,
      equipment: formEquipment.trim() || null,
    }

    if (editingExercise) {
      updateMutation.mutate({ id: editingExercise.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  // Filter exercises
  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesMuscle =
      !muscleFilter || ex.muscleGroup === muscleFilter ||
      ex.secondaryMuscle === muscleFilter ||
      ex.tertiaryMuscle === muscleFilter
    return matchesSearch && matchesMuscle
  })

  // Group by muscle for display
  const groupedExercises: Record<string, Exercise[]> = {}
  filteredExercises.forEach((ex) => {
    const group = ex.muscleGroup
    if (!groupedExercises[group]) groupedExercises[group] = []
    groupedExercises[group].push(ex)
  })

  return (
    <div className="p-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Ejercicios</h1>
        <Button
          onClick={() => {
            resetForm()
            setShowCreateDialog(true)
          }}
          className="bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] h-11 px-4"
        >
          <Plus className="w-5 h-5 mr-1" />
          Nuevo
        </Button>
      </div>

      {/* Search and filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 pl-11 text-base bg-[#141414] border-[#2a2a2a] rounded-xl"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilter(!showFilter)}
          className={`h-12 px-3 border-[#2a2a2a] ${muscleFilter ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]' : 'bg-[#141414]'}`}
        >
          <Filter className="w-5 h-5" />
        </Button>
      </div>

      {/* Muscle filter chips */}
      {showFilter && (
        <div className="mb-4 glass-card rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Filtrar por músculo
            </span>
            {muscleFilter && (
              <button
                onClick={() => setMuscleFilter('')}
                className="text-[#22c55e] text-xs font-medium"
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((muscle) => (
              <button
                key={muscle}
                onClick={() =>
                  setMuscleFilter(muscleFilter === muscle ? '' : muscle)
                }
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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

      {/* Exercise list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Dumbbell className="w-12 h-12 mb-3 opacity-50" />
          <p>No se encontraron ejercicios</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredExercises.map((exercise) => (
            <div
              key={exercise.id}
              className="glass-card rounded-xl p-4 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold text-lg truncate">
                  {exercise.name}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 text-xs">
                    {exercise.muscleGroup}
                  </Badge>
                  {exercise.secondaryMuscle && (
                    <Badge variant="secondary" className="text-xs">
                      {exercise.secondaryMuscle}
                    </Badge>
                  )}
                  {exercise.tertiaryMuscle && (
                    <Badge variant="secondary" className="text-xs">
                      {exercise.tertiaryMuscle}
                    </Badge>
                  )}
                  {exercise.equipment && (
                    <Badge variant="outline" className="text-xs">
                      {exercise.equipment}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(exercise)}
                  className="h-11 w-11 hover:bg-[#22c55e]/10"
                >
                  <Pencil className="w-5 h-5 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingExercise(exercise)}
                  className="h-11 w-11 hover:bg-destructive/10"
                >
                  <Trash2 className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || !!editingExercise}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false)
            setEditingExercise(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="bg-[#141414] border-[#2a2a2a] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Nombre</Label>
              <Input
                placeholder="Press banca, Sentadilla..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-12 text-base bg-[#0a0a0a] border-[#2a2a2a]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Grupo Muscular</Label>
              <Select value={formMuscle} onValueChange={setFormMuscle}>
                <SelectTrigger className="h-12 bg-[#0a0a0a] border-[#2a2a2a]">
                  <SelectValue placeholder="Seleccionar músculo" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-[#2a2a2a]">
                  {MUSCLE_GROUPS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Músculo Secundario</Label>
              <Select value={formSecondary} onValueChange={setFormSecondary}>
                <SelectTrigger className="h-12 bg-[#0a0a0a] border-[#2a2a2a]">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-[#2a2a2a]">
                  {MUSCLE_GROUPS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Músculo Terciario</Label>
              <Select value={formTertiary} onValueChange={setFormTertiary}>
                <SelectTrigger className="h-12 bg-[#0a0a0a] border-[#2a2a2a]">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-[#2a2a2a]">
                  {MUSCLE_GROUPS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Equipamiento</Label>
              <Input
                placeholder="Barra, Mancuernas, Máquina..."
                value={formEquipment}
                onChange={(e) => setFormEquipment(e.target.value)}
                className="h-12 text-base bg-[#0a0a0a] border-[#2a2a2a]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setEditingExercise(null)
                resetForm()
              }}
              className="border-[#2a2a2a] h-12"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] h-12 px-6"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Guardando...'
                : editingExercise
                  ? 'Guardar'
                  : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingExercise}
        onOpenChange={(open) => !open && setDeletingExercise(null)}
      >
        <AlertDialogContent className="bg-[#141414] border-[#2a2a2a]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ejercicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{deletingExercise?.name}&quot; permanentemente.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2a2a2a]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingExercise && deleteMutation.mutate(deletingExercise.id)
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
