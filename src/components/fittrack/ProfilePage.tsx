'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User,
  Pencil,
  TrendingUp,
  MessageCircle,
  Users,
  LogOut,
  Plus,
  Trash2,
  Camera,
  X,
  Dumbbell,
  Crown,
  Upload,
  Check,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-helpers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string
  name: string | null
  username: string | null
  email: string
  bio: string | null
  avatarUrl: string | null
  plan: string
  oneRepMaxes: OneRepMaxEntry[]
  physiquePhotosCount: number
}

interface OneRepMaxEntry {
  id: string
  exerciseId: string
  weight: number
  date: string
  exercise: {
    id: string
    name: string
    muscleGroup: string
  }
}

interface PhysiquePhoto {
  id: string
  photoUrl: string
  date: string
  createdAt: string
}

interface Exercise {
  id: string
  name: string
  muscleGroup: string
}

interface ProfilePageProps {
  onNavigate: (page: string) => void
  onLogout: () => void
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export function ProfilePage({ onNavigate, onLogout }: ProfilePageProps) {
  const queryClient = useQueryClient()
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAddRmDialog, setShowAddRmDialog] = useState(false)
  const [deletingRm, setDeletingRm] = useState<OneRepMaxEntry | null>(null)
  const [showUploadPhysiqueDialog, setShowUploadPhysiqueDialog] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiGet<ProfileData>('/profile'),
  })

  // Fetch physique photos
  const { data: physiquePhotos = [] } = useQuery({
    queryKey: ['physique-photos'],
    queryFn: () => apiGet<PhysiquePhoto[]>('/physique-photos'),
  })

  // Fetch exercises for 1RM dialog
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => apiGet<Exercise[]>('/exercises'),
  })

  // Delete 1RM mutation
  const deleteRmMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/one-rep-max/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Registro 1RM eliminado')
      setDeletingRm(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const planBadge = (plan: string) => {
    switch (plan) {
      case 'pro':
        return (
          <Badge className="bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30">
            <Crown className="w-3 h-3 mr-1" />
            PRO
          </Badge>
        )
      case 'admin':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Crown className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )
      default:
        return <Badge variant="secondary">Free</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 pt-6">
      <h1 className="text-2xl font-bold mb-6">Perfil</h1>

      {/* Physique photos carousel */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Fotos de físico
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUploadPhysiqueDialog(true)}
            className="h-9 text-[#22c55e] hover:bg-[#22c55e]/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            Subir foto
          </Button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scroll-container">
          {physiquePhotos.length === 0 ? (
            <div className="w-full glass-card rounded-xl p-6 text-center">
              <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground text-sm">Sin fotos de físico</p>
            </div>
          ) : (
            physiquePhotos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setViewingPhoto(photo.photoUrl)}
                className="shrink-0 w-28 h-36 rounded-xl overflow-hidden border border-[#2a2a2a] hover:border-[#22c55e]/30 transition-colors"
              >
                <img
                  src={photo.photoUrl}
                  alt="Foto de físico"
                  className="w-full h-full object-cover"
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* User info */}
      <div className="glass-card rounded-xl p-6 mb-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center shrink-0 overflow-hidden">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-[#22c55e]">
                {profile?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-foreground font-semibold text-lg truncate">
                {profile?.name || 'Usuario'}
              </p>
              {profile?.plan && planBadge(profile.plan)}
            </div>
            {profile?.username && (
              <p className="text-muted-foreground text-sm">
                @{profile.username}
              </p>
            )}
            {profile?.bio && (
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                {profile.bio}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEditDialog(true)}
            className="h-11 w-11 shrink-0 hover:bg-[#22c55e]/10"
          >
            <Pencil className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Plan upgrade */}
      {profile?.plan === 'free' && (
        <button
          onClick={() => toast.info('Próximamente')}
          className="w-full glass-card rounded-xl p-4 mb-4 flex items-center gap-3 hover:bg-[#22c55e]/5 transition-colors text-left border border-[#22c55e]/20"
        >
          <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6 text-[#22c55e]" />
          </div>
          <div>
            <p className="text-foreground font-semibold">Mejorar a PRO</p>
            <p className="text-muted-foreground text-sm">
              Desbloquea AI Coach y más funciones
            </p>
          </div>
        </button>
      )}

      {/* 1RM Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Mis RM
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddRmDialog(true)}
            className="h-9 text-[#22c55e] hover:bg-[#22c55e]/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            Añadir RM
          </Button>
        </div>

        {profile?.oneRepMaxes?.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center">
            <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground text-sm">Sin registros 1RM</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {profile?.oneRepMaxes?.map((orm) => (
              <div key={orm.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-foreground font-medium">{orm.exercise.name}</p>
                  <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 text-xs mt-1">
                    {orm.exercise.muscleGroup}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#22c55e] font-bold text-xl">
                    {orm.weight} kg
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingRm(orm)}
                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sub-page navigation */}
      <div className="flex flex-col gap-2 mb-6">
        <button
          onClick={() => onNavigate('progress')}
          className="glass-card rounded-xl p-4 flex items-center gap-4 hover:bg-[#22c55e]/5 transition-colors w-full text-left"
        >
          <TrendingUp className="w-6 h-6 text-[#22c55e]" />
          <span className="text-foreground font-medium">Progreso</span>
        </button>

        <button
          onClick={() => onNavigate('ai-chat')}
          className="glass-card rounded-xl p-4 flex items-center gap-4 hover:bg-[#22c55e]/5 transition-colors w-full text-left"
        >
          <MessageCircle className="w-6 h-6 text-[#22c55e]" />
          <span className="text-foreground font-medium">IA Coach</span>
        </button>

        <button
          onClick={() => onNavigate('social')}
          className="glass-card rounded-xl p-4 flex items-center gap-4 hover:bg-[#22c55e]/5 transition-colors w-full text-left"
        >
          <Users className="w-6 h-6 text-[#22c55e]" />
          <span className="text-foreground font-medium">Social</span>
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full glass-card rounded-xl p-4 flex items-center gap-4 hover:bg-destructive/5 transition-colors text-left"
      >
        <LogOut className="w-6 h-6 text-destructive" />
        <span className="text-destructive font-medium">Cerrar Sesión</span>
      </button>

      {/* Edit profile dialog */}
      {showEditDialog && (
        <EditProfileDialog
          profile={profile!}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['profile'] })
            setShowEditDialog(false)
          }}
        />
      )}

      {/* Add 1RM dialog */}
      {showAddRmDialog && (
        <AddRmDialog
          exercises={exercises}
          onClose={() => setShowAddRmDialog(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['profile'] })
            setShowAddRmDialog(false)
          }}
        />
      )}

      {/* Upload physique photo dialog */}
      {showUploadPhysiqueDialog && (
        <UploadPhysiqueDialog
          onClose={() => setShowUploadPhysiqueDialog(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['physique-photos'] })
            setShowUploadPhysiqueDialog(false)
          }}
        />
      )}

      {/* Photo viewer */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setViewingPhoto(null)}
        >
          <img
            src={viewingPhoto}
            alt="Foto de físico"
            className="max-w-full max-h-[90vh] object-contain"
          />
          <button
            onClick={() => setViewingPhoto(null)}
            className="absolute top-4 right-4 h-11 w-11 flex items-center justify-center rounded-full bg-black/50 text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Delete 1RM confirmation */}
      <AlertDialog
        open={!!deletingRm}
        onOpenChange={(open) => !open && setDeletingRm(null)}
      >
        <AlertDialogContent className="bg-[#141414] border-[#2a2a2a]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro 1RM?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el registro de {deletingRm?.exercise.name} ({deletingRm?.weight} kg) permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2a2a2a]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRm && deleteRmMutation.mutate(deletingRm.id)}
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

// ─── Edit Profile Dialog ──────────────────────────────────────────────────────

function EditProfileDialog({
  profile,
  onClose,
  onSuccess,
}: {
  profile: ProfileData
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState(profile.name || '')
  const [username, setUsername] = useState(profile.username || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const usernameCheckTimer = useRef<NodeJS.Timeout | null>(null)

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiPut('/profile', data),
    onSuccess: () => {
      toast.success('Perfil actualizado')
      onSuccess()
    },
    onError: (err: any) => toast.error(err.message),
  })

  const checkUsername = async (value: string) => {
    if (!value.trim() || value === profile.username) {
      setUsernameAvailable(null)
      return
    }
    setCheckingUsername(true)
    try {
      const result = await apiGet<{ available: boolean }>(`/profile/username?username=${encodeURIComponent(value)}`)
      setUsernameAvailable(result.available)
    } catch {
      setUsernameAvailable(null)
    } finally {
      setCheckingUsername(false)
    }
  }

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setUsernameAvailable(null)
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current)
    usernameCheckTimer.current = setTimeout(() => checkUsername(value), 500)
  }

  const handleSubmit = () => {
    if (username && usernameAvailable === false) {
      toast.error('El nombre de usuario no está disponible')
      return
    }
    updateMutation.mutate({
      name: name.trim() || null,
      username: username.trim() || null,
      bio: bio.trim() || null,
    })
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#141414] border-[#2a2a2a] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Nombre</Label>
            <Input
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Nombre de usuario</Label>
            <div className="relative">
              <Input
                placeholder="@usuario"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="h-12 bg-[#0a0a0a] border-[#2a2a2a] pr-10"
              />
              {checkingUsername && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!checkingUsername && usernameAvailable === true && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#22c55e]" />
              )}
              {!checkingUsername && usernameAvailable === false && (
                <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
              )}
            </div>
            {usernameAvailable === false && (
              <p className="text-destructive text-xs">Nombre de usuario no disponible</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Bio</Label>
            <Textarea
              placeholder="Cuéntanos sobre ti..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-[#0a0a0a] border-[#2a2a2a] min-h-[80px]"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#2a2a2a] h-12"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending || usernameAvailable === false}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] h-12 px-6"
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add 1RM Dialog ───────────────────────────────────────────────────────────

function AddRmDialog({
  exercises,
  onClose,
  onSuccess,
}: {
  exercises: Exercise[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [exerciseId, setExerciseId] = useState('')
  const [weight, setWeight] = useState('')
  const [search, setSearch] = useState('')

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost('/one-rep-max', data),
    onSuccess: () => {
      toast.success('1RM registrado')
      onSuccess()
    },
    onError: (err: any) => toast.error(err.message),
  })

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = () => {
    if (!exerciseId || !weight) {
      toast.error('Selecciona un ejercicio e introduce el peso')
      return
    }
    createMutation.mutate({
      exerciseId,
      weight: parseFloat(weight),
    })
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#141414] border-[#2a2a2a] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Añadir 1RM</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Search exercises */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Ejercicio</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ejercicio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 pl-9 bg-[#0a0a0a] border-[#2a2a2a]"
              />
            </div>
          </div>

          {/* Exercise selector */}
          <Select value={exerciseId} onValueChange={setExerciseId}>
            <SelectTrigger className="h-12 bg-[#0a0a0a] border-[#2a2a2a]">
              <SelectValue placeholder="Seleccionar ejercicio" />
            </SelectTrigger>
            <SelectContent className="bg-[#141414] border-[#2a2a2a] max-h-60">
              {filteredExercises.map((ex) => (
                <SelectItem key={ex.id} value={ex.id}>
                  {ex.name} ({ex.muscleGroup})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Weight */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Peso (kg)</Label>
            <Input
              type="number"
              placeholder="Ej: 100"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-12 bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#2a2a2a] h-12"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !exerciseId || !weight}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] h-12 px-6"
          >
            {createMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Upload Physique Photo Dialog ─────────────────────────────────────────────

function UploadPhysiqueDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result as string)
      reader.readAsDataURL(selected)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecciona una foto')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'physique')

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Error al subir imagen')
      }

      const { url } = await uploadRes.json()

      await apiPost('/physique-photos', { photoUrl: url })

      toast.success('Foto de físico subida')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Error al subir foto')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#141414] border-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle className="text-xl">Subir foto de físico</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="aspect-[4/3] rounded-xl border-2 border-dashed border-[#2a2a2a] flex items-center justify-center cursor-pointer hover:border-[#22c55e]/50 transition-colors overflow-hidden bg-[#0a0a0a]"
          >
            {preview ? (
              <img src={preview} alt="Vista previa" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground p-4">
                <Upload className="w-10 h-10 mb-2" />
                <p className="text-sm font-medium">Toca para seleccionar foto</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#2a2a2a] h-12"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] h-12 px-6"
          >
            {uploading ? 'Subiendo...' : 'Subir foto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
