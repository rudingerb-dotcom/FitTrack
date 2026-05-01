'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  TrendingUp,
  Camera,
  Plus,
  Trash2,
  Image as ImageIcon,
  Calendar,
  Upload,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exercise {
  id: string
  name: string
  muscleGroup: string
}

interface Routine {
  id: string
  name: string
}

interface ProgressDataPoint {
  date: string
  workoutId: string
  workoutName: string
  maxWeight: number
  totalVolume: number
}

interface RoutineProgressDataPoint {
  date: string
  workoutId: string
  workoutName: string
  totalVolume: number
  totalSets: number
  duration: number
}

interface ProgressPhoto {
  id: string
  photoUrl: string
  date: string
  bodyWeight: number | null
  note: string | null
  createdAt: string
}

interface ProgressPageProps {
  onBack: () => void
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg p-3 text-sm border border-[#2a2a2a]">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((item: any, i: number) => (
        <p key={i} className="text-[#22c55e] font-semibold">
          {item.name}: {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
          {item.name?.includes('Volumen') ? ' kg' : ' kg'}
        </p>
      ))}
    </div>
  )
}

// ─── ProgressPage ─────────────────────────────────────────────────────────────

export function ProgressPage({ onBack }: ProgressPageProps) {
  const [activeTab, setActiveTab] = useState<'graficas' | 'fotos'>('graficas')

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a] border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-11 w-11"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Progreso</h1>
        </div>

        {/* Tab selector */}
        <div className="flex px-4 pb-3 gap-2">
          <button
            onClick={() => setActiveTab('graficas')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'graficas'
                ? 'bg-[#22c55e] text-[#050f09]'
                : 'bg-[#141414] text-muted-foreground hover:bg-[#1a1a1a]'
            }`}
          >
            Gráficas
          </button>
          <button
            onClick={() => setActiveTab('fotos')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'fotos'
                ? 'bg-[#22c55e] text-[#050f09]'
                : 'bg-[#141414] text-muted-foreground hover:bg-[#1a1a1a]'
            }`}
          >
            Fotos
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'graficas' ? <GraficasTab /> : <FotosTab />}
    </div>
  )
}

// ─── Graficas Tab ─────────────────────────────────────────────────────────────

function GraficasTab() {
  const [mode, setMode] = useState<'exercise' | 'routine'>('exercise')
  const [selectedId, setSelectedId] = useState<string>('')

  // Fetch exercises and routines for dropdowns
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => apiGet<Exercise[]>('/exercises'),
  })

  const { data: routines = [] } = useQuery({
    queryKey: ['routines'],
    queryFn: () => apiGet<Routine[]>('/routines'),
  })

  // Fetch progress data
  const { data: progressData, isLoading: loadingProgress } = useQuery({
    queryKey: ['progress', mode, selectedId],
    queryFn: () =>
      apiGet<any>(`/progress?type=${mode}&id=${selectedId}`),
    enabled: !!selectedId,
  })

  const items = mode === 'exercise' ? exercises : routines

  // Format chart data
  const chartData = (progressData?.progress || []).map((p: any) => ({
    date: p.date ? format(new Date(p.date), 'dd/MM', { locale: es }) : '',
    'Peso máx.': p.maxWeight ?? p.totalVolume,
    'Volumen': p.totalVolume,
  }))

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('exercise'); setSelectedId('') }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            mode === 'exercise'
              ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
              : 'bg-[#141414] text-muted-foreground border border-[#2a2a2a]'
          }`}
        >
          Por ejercicio
        </button>
        <button
          onClick={() => { setMode('routine'); setSelectedId('') }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            mode === 'routine'
              ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
              : 'bg-[#141414] text-muted-foreground border border-[#2a2a2a]'
          }`}
        >
          Por rutina
        </button>
      </div>

      {/* Dropdown selector */}
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="h-12 bg-[#141414] border-[#2a2a2a] rounded-xl">
          <SelectValue placeholder={mode === 'exercise' ? 'Seleccionar ejercicio...' : 'Seleccionar rutina...'} />
        </SelectTrigger>
        <SelectContent className="bg-[#141414] border-[#2a2a2a]">
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Charts */}
      {!selectedId ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <TrendingUp className="w-12 h-12 text-[#22c55e] mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">
            Selecciona {mode === 'exercise' ? 'un ejercicio' : 'una rutina'} para ver tu progreso
          </p>
        </div>
      ) : loadingProgress ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <TrendingUp className="w-12 h-12 text-[#22c55e] mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">
            No hay datos de progreso disponibles aún
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Completa entrenamientos con este {mode === 'exercise' ? 'ejercicio' : 'rutina'} para ver tu progreso
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Max weight chart */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Peso máximo por sesión
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="Peso máx."
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    dot={{ fill: '#22c55e', r: 4 }}
                    activeDot={{ r: 6, fill: '#4ade80' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Volume chart */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Volumen total
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="Volumen"
                    fill="#22c55e"
                    radius={[6, 6, 0, 0]}
                    fillOpacity={0.8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Fotos Tab ────────────────────────────────────────────────────────────────

function FotosTab() {
  const queryClient = useQueryClient()
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState<ProgressPhoto | null>(null)
  const [viewingPhoto, setViewingPhoto] = useState<ProgressPhoto | null>(null)

  // Fetch progress photos
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['progress-photos'],
    queryFn: () => apiGet<ProgressPhoto[]>('/progress-photos'),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/progress-photos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress-photos'] })
      toast.success('Foto eliminada')
      setDeletingPhoto(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Upload button */}
      <Button
        onClick={() => setShowUploadDialog(true)}
        className="w-full h-12 bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] font-semibold rounded-xl"
      >
        <Camera className="w-5 h-5 mr-2" />
        Subir foto
      </Button>

      {/* Photos list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <ImageIcon className="w-12 h-12 text-[#22c55e] mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">
            No tienes fotos de progreso
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Sube fotos para hacer seguimiento de tu evolución
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="glass-card rounded-xl overflow-hidden">
              {/* Photo */}
              <button
                onClick={() => setViewingPhoto(photo)}
                className="w-full aspect-[4/3] bg-[#1a1a1a] overflow-hidden"
              >
                <img
                  src={photo.photoUrl}
                  alt="Foto de progreso"
                  className="w-full h-full object-cover"
                />
              </button>

              {/* Info */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-foreground font-medium text-sm">
                    {photo.date
                      ? format(new Date(photo.date), "d 'de' MMMM, yyyy", { locale: es })
                      : 'Sin fecha'}
                  </p>
                  {photo.bodyWeight && (
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {photo.bodyWeight} kg
                    </p>
                  )}
                  {photo.note && (
                    <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">
                      {photo.note}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingPhoto(photo)}
                  className="h-10 w-10 text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      {showUploadDialog && (
        <UploadPhotoDialog
          onClose={() => setShowUploadDialog(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['progress-photos'] })
            setShowUploadDialog(false)
          }}
        />
      )}

      {/* Full-size photo viewer */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setViewingPhoto(null)}
        >
          <img
            src={viewingPhoto.photoUrl}
            alt="Foto de progreso"
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

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingPhoto}
        onOpenChange={(open) => !open && setDeletingPhoto(null)}
      >
        <AlertDialogContent className="bg-[#141414] border-[#2a2a2a]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta foto de progreso se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2a2a2a]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPhoto && deleteMutation.mutate(deletingPhoto.id)}
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

// ─── Upload Photo Dialog ──────────────────────────────────────────────────────

function UploadPhotoDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [bodyWeight, setBodyWeight] = useState('')
  const [note, setNote] = useState('')
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
      // 1. Upload file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'progress')

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Error al subir imagen')
      }

      const { url } = await uploadRes.json()

      // 2. Create progress photo record
      await apiPost('/progress-photos', {
        photoUrl: url,
        date,
        bodyWeight: bodyWeight ? parseFloat(bodyWeight) : null,
        note: note.trim() || null,
      })

      toast.success('Foto de progreso subida')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Error al subir foto')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#141414] border-[#2a2a2a] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Subir foto de progreso</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Photo preview / select */}
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

          {/* Date */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Fecha</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>

          {/* Body weight */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Peso corporal (kg)</Label>
            <Input
              type="number"
              placeholder="Ej: 75.5"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              className="h-12 bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>

          {/* Note */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Nota (opcional)</Label>
            <Textarea
              placeholder="Ej: Semana 8 de definición..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-[#0a0a0a] border-[#2a2a2a] min-h-[60px]"
              rows={2}
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
