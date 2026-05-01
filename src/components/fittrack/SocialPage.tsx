'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Users,
  Send,
  Dumbbell,
  Share2,
  Trash2,
  User as UserIcon,
} from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-helpers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserResult {
  id: string
  name: string | null
  username: string | null
  avatarUrl: string | null
  plan: string
}

interface FriendRequest {
  id: string
  type: 'sent' | 'received'
  user: UserResult
  createdAt: string
}

interface Friend {
  friendshipId: string
  id: string
  name: string | null
  username: string | null
  avatarUrl: string | null
  plan: string
}

interface SharedRoutine {
  id: string
  routineId: string
  senderId: string
  receiverId: string
  status: string
  createdAt: string
  routine: {
    id: string
    name: string
    description: string | null
    exercises: any[]
  }
  sender: UserResult
}

interface Routine {
  id: string
  name: string
  exercises: any[]
}

interface SocialPageProps {
  onBack: () => void
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function UserAvatar({ user, size = 'md' }: { user: UserResult; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center shrink-0 overflow-hidden`}>
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-[#22c55e]">
          {user.name?.[0]?.toUpperCase() || 'U'}
        </span>
      )}
    </div>
  )
}

// ─── SocialPage ───────────────────────────────────────────────────────────────

export function SocialPage({ onBack }: SocialPageProps) {
  const [activeTab, setActiveTab] = useState<'buscar' | 'solicitudes' | 'amigos'>('buscar')

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
          <h1 className="text-xl font-bold">Social</h1>
        </div>

        {/* Tab selector */}
        <div className="flex px-4 pb-3 gap-2">
          <button
            onClick={() => setActiveTab('buscar')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'buscar'
                ? 'bg-[#22c55e] text-[#050f09]'
                : 'bg-[#141414] text-muted-foreground hover:bg-[#1a1a1a]'
            }`}
          >
            Buscar
          </button>
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'solicitudes'
                ? 'bg-[#22c55e] text-[#050f09]'
                : 'bg-[#141414] text-muted-foreground hover:bg-[#1a1a1a]'
            }`}
          >
            Solicitudes
          </button>
          <button
            onClick={() => setActiveTab('amigos')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'amigos'
                ? 'bg-[#22c55e] text-[#050f09]'
                : 'bg-[#141414] text-muted-foreground hover:bg-[#1a1a1a]'
            }`}
          >
            Amigos
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'buscar' && <BuscarTab />}
      {activeTab === 'solicitudes' && <SolicitudesTab />}
      {activeTab === 'amigos' && <AmigosTab />}
    </div>
  )
}

// ─── Buscar Tab ───────────────────────────────────────────────────────────────

function BuscarTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search
  useState(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400)
    return () => clearTimeout(timer)
  })

  const handleSearch = () => {
    setDebouncedQuery(searchQuery)
  }

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['social-search', debouncedQuery],
    queryFn: () => apiGet<UserResult[]>(`/social/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.trim().length > 0,
  })

  // Send friend request mutation
  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => apiPost('/social/friends', { userId }),
    onSuccess: () => {
      toast.success('Solicitud enviada')
    },
    onError: (err: any) => toast.error(err.message),
  })

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de usuario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-12 pl-11 text-base bg-[#141414] border-[#2a2a2a] rounded-xl"
          />
        </div>
        <Button
          onClick={handleSearch}
          className="h-12 px-4 bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] rounded-xl"
        >
          <Search className="w-5 h-5" />
        </Button>
      </div>

      {/* Results */}
      {debouncedQuery && searching && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {debouncedQuery && !searching && searchResults.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No se encontraron usuarios</p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="flex flex-col gap-2">
          {searchResults.map((user) => (
            <div key={user.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
              <UserAvatar user={user} />
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold truncate">
                  {user.name || 'Usuario'}
                </p>
                {user.username && (
                  <p className="text-muted-foreground text-sm">@{user.username}</p>
                )}
              </div>
              <Button
                onClick={() => sendRequestMutation.mutate(user.id)}
                disabled={sendRequestMutation.isPending}
                size="sm"
                className="h-10 bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] shrink-0"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Enviar solicitud
              </Button>
            </div>
          ))}
        </div>
      )}

      {!debouncedQuery && (
        <div className="glass-card rounded-xl p-8 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">
            Busca usuarios por su nombre de usuario
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Solicitudes Tab ──────────────────────────────────────────────────────────

function SolicitudesTab() {
  const queryClient = useQueryClient()

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['social-requests'],
    queryFn: () => apiGet<{ sent: FriendRequest[]; received: FriendRequest[] }>('/social/requests'),
  })

  const sent = requestsData?.sent || []
  const received = requestsData?.received || []

  // Accept/reject mutation
  const respondMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiPut(`/social/friends/${id}`, { action }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['social-requests'] })
      queryClient.invalidateQueries({ queryKey: ['social-friends'] })
      toast.success(variables.action === 'accept' ? 'Solicitud aceptada' : 'Solicitud rechazada')
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Cancel sent request (delete)
  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/social/friends/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-requests'] })
      toast.success('Solicitud cancelada')
    },
    onError: (err: any) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Received */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Recibidas ({received.length})
        </h3>
        {received.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-sm">No hay solicitudes pendientes</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {received.map((req) => (
              <div key={req.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
                <UserAvatar user={req.user} />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-semibold truncate">
                    {req.user.name || 'Usuario'}
                  </p>
                  {req.user.username && (
                    <p className="text-muted-foreground text-sm">@{req.user.username}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    onClick={() => respondMutation.mutate({ id: req.id, action: 'accept' })}
                    size="sm"
                    className="h-10 bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09]"
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Aceptar
                  </Button>
                  <Button
                    onClick={() => respondMutation.mutate({ id: req.id, action: 'reject' })}
                    variant="outline"
                    size="sm"
                    className="h-10 border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <UserX className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Enviadas ({sent.length})
        </h3>
        {sent.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-sm">No hay solicitudes enviadas</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sent.map((req) => (
              <div key={req.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
                <UserAvatar user={req.user} />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-semibold truncate">
                    {req.user.name || 'Usuario'}
                  </p>
                  {req.user.username && (
                    <p className="text-muted-foreground text-sm">@{req.user.username}</p>
                  )}
                </div>
                <Button
                  onClick={() => cancelMutation.mutate(req.id)}
                  variant="outline"
                  size="sm"
                  className="h-10 border-[#2a2a2a] text-muted-foreground hover:text-destructive hover:border-destructive"
                >
                  Cancelar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Amigos Tab ───────────────────────────────────────────────────────────────

function AmigosTab() {
  const queryClient = useQueryClient()
  const [showShareDialog, setShowShareDialog] = useState<Friend | null>(null)
  const [removingFriend, setRemovingFriend] = useState<Friend | null>(null)
  const [viewingFriend, setViewingFriend] = useState<Friend | null>(null)

  // Fetch friends
  const { data: friends = [], isLoading } = useQuery({
    queryKey: ['social-friends'],
    queryFn: () => apiGet<Friend[]>('/social/friends'),
  })

  // Fetch shared routines
  const { data: sharedRoutines = [] } = useQuery({
    queryKey: ['social-shared-routines'],
    queryFn: () => apiGet<SharedRoutine[]>('/social/shared-routines'),
  })

  // Remove friend mutation
  const removeMutation = useMutation({
    mutationFn: (friendshipId: string) => apiDelete(`/social/friends/${friendshipId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-friends'] })
      toast.success('Amigo eliminado')
      setRemovingFriend(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Accept shared routine mutation
  const acceptRoutineMutation = useMutation({
    mutationFn: (shareId: string) => apiPut('/social/shared-routines', { shareId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-shared-routines'] })
      queryClient.invalidateQueries({ queryKey: ['routines'] })
      toast.success('Rutina aceptada y añadida a tus rutinas')
    },
    onError: (err: any) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Shared routines section */}
      {sharedRoutines.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Rutinas compartidas contigo
          </h3>
          <div className="flex flex-col gap-2">
            {sharedRoutines.map((share) => (
              <div key={share.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <UserAvatar user={share.sender} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium text-sm truncate">
                      {share.sender.name || 'Usuario'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      te compartió una rutina
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-5 h-5 text-[#22c55e]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold text-sm truncate">
                      {share.routine.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {share.routine.exercises?.length || 0} ejercicios
                    </p>
                  </div>
                  <Button
                    onClick={() => acceptRoutineMutation.mutate(share.id)}
                    disabled={acceptRoutineMutation.isPending}
                    size="sm"
                    className="h-9 bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] shrink-0"
                  >
                    Aceptar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Amigos ({friends.length})
        </h3>
        {friends.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No tienes amigos aún</p>
            <p className="text-muted-foreground text-sm mt-1">
              Busca usuarios y envía solicitudes de amistad
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((friend) => (
              <div key={friend.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setViewingFriend(friend)}>
                    <UserAvatar user={friend} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold truncate">
                      {friend.name || 'Usuario'}
                    </p>
                    {friend.username && (
                      <p className="text-muted-foreground text-sm">@{friend.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShareDialog(friend)}
                    className="flex-1 h-10 border-[#2a2a2a] text-[#22c55e] hover:bg-[#22c55e]/5 hover:border-[#22c55e]/30"
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Compartir rutina
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemovingFriend(friend)}
                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share routine dialog */}
      {showShareDialog && (
        <ShareRoutineDialog
          friend={showShareDialog}
          onClose={() => setShowShareDialog(null)}
        />
      )}

      {/* Friend profile viewer */}
      {viewingFriend && (
        <FriendProfileDialog
          friend={viewingFriend}
          onClose={() => setViewingFriend(null)}
        />
      )}

      {/* Remove friend confirmation */}
      <AlertDialog
        open={!!removingFriend}
        onOpenChange={(open) => !open && setRemovingFriend(null)}
      >
        <AlertDialogContent className="bg-[#141414] border-[#2a2a2a]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar amigo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a &quot;{removingFriend?.name || 'Usuario'}&quot; de tu lista de amigos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2a2a2a]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingFriend && removeMutation.mutate(removingFriend.friendshipId)}
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

// ─── Share Routine Dialog ─────────────────────────────────────────────────────

function ShareRoutineDialog({
  friend,
  onClose,
}: {
  friend: Friend
  onClose: () => void
}) {
  const [selectedRoutineId, setSelectedRoutineId] = useState('')

  const { data: routines = [] } = useQuery({
    queryKey: ['routines'],
    queryFn: () => apiGet<Routine[]>('/routines'),
  })

  const shareMutation = useMutation({
    mutationFn: (data: { routineId: string; friendId: string }) =>
      apiPost('/social/share-routine', data),
    onSuccess: () => {
      toast.success('Rutina compartida')
      onClose()
    },
    onError: (err: any) => toast.error(err.message),
  })

  const handleShare = () => {
    if (!selectedRoutineId) {
      toast.error('Selecciona una rutina')
      return
    }
    shareMutation.mutate({ routineId: selectedRoutineId, friendId: friend.id })
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#141414] border-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle className="text-xl">Compartir rutina con {friend.name || 'Usuario'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {routines.length === 0 ? (
            <div className="text-center py-6">
              <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground text-sm">No tienes rutinas para compartir</p>
            </div>
          ) : (
            <Select value={selectedRoutineId} onValueChange={setSelectedRoutineId}>
              <SelectTrigger className="h-12 bg-[#0a0a0a] border-[#2a2a2a]">
                <SelectValue placeholder="Seleccionar rutina" />
              </SelectTrigger>
              <SelectContent className="bg-[#141414] border-[#2a2a2a]">
                {routines.map((routine) => (
                  <SelectItem key={routine.id} value={routine.id}>
                    {routine.name} ({routine.exercises?.length || 0} ejercicios)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
            onClick={handleShare}
            disabled={shareMutation.isPending || !selectedRoutineId || routines.length === 0}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] h-12 px-6"
          >
            <Send className="w-4 h-4 mr-2" />
            {shareMutation.isPending ? 'Compartiendo...' : 'Compartir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Friend Profile Dialog ────────────────────────────────────────────────────

function FriendProfileDialog({
  friend,
  onClose,
}: {
  friend: Friend
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#141414] border-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle className="text-xl">Perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-4 gap-3">
          <UserAvatar user={friend} size="lg" />
          <div className="text-center">
            <p className="text-foreground font-semibold text-lg">
              {friend.name || 'Usuario'}
            </p>
            {friend.username && (
              <p className="text-muted-foreground text-sm">@{friend.username}</p>
            )}
          </div>
          <Badge variant="secondary" className="mt-1">
            {friend.plan === 'pro' ? 'PRO' : friend.plan === 'admin' ? 'Admin' : 'Free'}
          </Badge>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full border-[#2a2a2a] h-12"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
