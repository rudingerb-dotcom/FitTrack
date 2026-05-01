'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Lock,
  Send,
  Plus,
  Menu,
  Trash2,
  Bot,
  User,
  Save,
  Sparkles,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { apiGet, apiPost, apiDelete } from '@/lib/api-helpers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  name: string | null
  username: string | null
  plan: string
  avatarUrl: string | null
  bio: string | null
}

interface Conversation {
  id: string
  title: string
  createdAt: string
  messages: any[]
}

interface AIMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface RoutineJSON {
  name: string
  description?: string
  exercises: {
    exerciseName: string
    muscleGroup: string
    sets: { type: string; weight: number; reps: number; rir: number }[]
    order: number
  }[]
}

interface AIChatPageProps {
  onBack: () => void
}

// ─── Parse routine JSON from AI message ───────────────────────────────────────

function tryParseRoutine(content: string): RoutineJSON | null {
  // Try to find a JSON block in the message
  const jsonMatch = content.match(/\{[\s\S]*"exercises"[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (parsed.name && parsed.exercises && Array.isArray(parsed.exercises)) {
      return parsed as RoutineJSON
    }
  } catch {
    // Not valid JSON
  }
  return null
}

// ─── Locked Screen (Free Plan) ────────────────────────────────────────────────

function LockedScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
      <div className="glass-card rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full bg-[#22c55e]/10 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-10 h-10 text-[#22c55e]" />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">
          FitCoach AI es una función PRO
        </h2>

        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Tu entrenador personal AI puede crear rutinas personalizadas, corregir tu técnica,
          asesorarte en nutrición y ayudarte a progresar más rápido.
        </p>

        <div className="flex flex-col gap-3 mb-6">
          {[
            'Rutinas personalizadas por IA',
            'Corrección de técnica',
            'Consejos de nutrición',
            'Estrategias de progresión',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-[#22c55e] shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={() => toast.info('Próximamente')}
          className="w-full h-14 text-lg font-semibold bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] green-glow rounded-xl"
        >
          Mejorar a PRO - 2,99€/mes
        </Button>

        <Button
          variant="ghost"
          onClick={onBack}
          className="w-full h-12 mt-3 text-muted-foreground"
        >
          Volver
        </Button>
      </div>
    </div>
  )
}

// ─── AI Chat Page ─────────────────────────────────────────────────────────────

export function AIChatPage({ onBack }: AIChatPageProps) {
  const queryClient = useQueryClient()
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [deletingConversation, setDeletingConversation] = useState<Conversation | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check user plan
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiGet<Profile>('/profile'),
  })

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => apiGet<Conversation[]>('/ai-chat/conversations'),
    enabled: profile?.plan !== 'free',
  })

  // Fetch messages for current conversation
  const { data: conversationData } = useQuery({
    queryKey: ['ai-conversation', currentConversationId],
    queryFn: () => apiGet<Conversation>(`/ai-chat/conversations/${currentConversationId}`),
    enabled: !!currentConversationId && profile?.plan !== 'free',
  })

  // Sync messages from query data
  useEffect(() => {
    if (conversationData?.messages) {
      setMessages(conversationData.messages)
    }
  }, [conversationData])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message
  const handleSend = async () => {
    if (!inputMessage.trim() || isSending) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsSending(true)

    // Optimistic: add user message
    const tempUserMsg: AIMessage = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversationId || '',
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const response = await apiPost<{ conversationId: string; message: string }>('/ai-chat', {
        message: userMessage,
        conversationId: currentConversationId,
      })

      // Update conversation ID if new
      if (!currentConversationId) {
        setCurrentConversationId(response.conversationId)
      }

      // Add AI response
      const aiMsg: AIMessage = {
        id: `ai-${Date.now()}`,
        conversationId: response.conversationId,
        role: 'assistant',
        content: response.message,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMsg])

      // Refresh conversations list
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar mensaje')
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
    } finally {
      setIsSending(false)
    }
  }

  // New conversation
  const handleNewConversation = async () => {
    try {
      const conv = await apiPost<Conversation>('/ai-chat/conversations', {
        title: 'Nueva conversación',
      })
      setCurrentConversationId(conv.id)
      setMessages([])
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    } catch (err: any) {
      toast.error(err.message || 'Error al crear conversación')
    }
  }

  // Delete conversation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/ai-chat/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
      toast.success('Conversación eliminada')
      setDeletingConversation(null)
      if (deletingConversation?.id === currentConversationId) {
        setCurrentConversationId(null)
        setMessages([])
      }
    },
    onError: (err: any) => toast.error(err.message),
  })

  // If free plan, show locked screen
  if (profile?.plan === 'free') {
    return <LockedScreen onBack={onBack} />
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a] border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3 p-4">
          {/* Drawer toggle */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-[#141414] border-[#2a2a2a] w-80 p-0">
              <SheetHeader className="p-4 border-b border-[#2a2a2a]">
                <SheetTitle className="text-lg">Conversaciones</SheetTitle>
              </SheetHeader>

              <div className="p-3">
                <Button
                  onClick={handleNewConversation}
                  className="w-full h-11 bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] font-semibold"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nueva conversación
                </Button>
              </div>

              <div className="flex flex-col gap-1 px-3 max-h-[calc(100vh-160px)] overflow-y-auto">
                {conversations.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No hay conversaciones
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`flex items-center gap-2 rounded-lg p-3 cursor-pointer group transition-colors ${
                        conv.id === currentConversationId
                          ? 'bg-[#22c55e]/10 border border-[#22c55e]/20'
                          : 'hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setCurrentConversationId(conv.id)
                          setDrawerOpen(false)
                        }}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-foreground text-sm font-medium truncate">
                          {conv.title}
                        </p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {format(new Date(conv.createdAt), "d MMM, HH:mm", { locale: es })}
                        </p>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingConversation(conv)
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-11 w-11"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#22c55e]" />
            FitCoach AI
          </h1>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && !currentConversationId && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-[#22c55e]" />
            </div>
            <h3 className="text-foreground font-semibold text-lg mb-2">
              ¡Hola! Soy tu FitCoach AI
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Puedo ayudarte a crear rutinas, mejorar tu técnica, y asesorarte en nutrición.
              ¡Escríbeme!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          const routine = !isUser ? tryParseRoutine(msg.content) : null

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  isUser
                    ? 'bg-[#22c55e] text-[#050f09] rounded-br-md'
                    : 'bg-[#1a1a1a] text-foreground border border-[#2a2a2a] rounded-bl-md'
                }`}
              >
                {/* Message content */}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content.split(/```[\s\S]*?```/).map((part, i) => (
                    <span key={i}>{part}</span>
                  ))}
                </div>

                {/* Routine preview */}
                {routine && (
                  <RoutinePreview
                    routine={routine}
                    onSave={() => handleSaveRoutine(routine)}
                  />
                )}
              </div>
            </div>
          )
        })}

        {/* Loading indicator */}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a1a] text-foreground border border-[#2a2a2a] rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#22c55e] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#22c55e] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#22c55e] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="sticky bottom-0 bg-[#0a0a0a] border-t border-[#2a2a2a] p-3">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Escribe tu mensaje..."
            className="flex-1 h-12 bg-[#141414] border-[#2a2a2a] rounded-xl text-base"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={isSending || !inputMessage.trim()}
            className="h-12 w-12 bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] rounded-xl px-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Delete conversation dialog */}
      <AlertDialog
        open={!!deletingConversation}
        onOpenChange={(open) => !open && setDeletingConversation(null)}
      >
        <AlertDialogContent className="bg-[#141414] border-[#2a2a2a]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{deletingConversation?.title}&quot; y todos sus mensajes permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2a2a2a]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingConversation && deleteMutation.mutate(deletingConversation.id)}
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

// ─── Routine Preview Component ────────────────────────────────────────────────

function RoutinePreview({
  routine,
  onSave,
}: {
  routine: RoutineJSON
  onSave: () => void
}) {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 border-t border-[#2a2a2a] pt-3">
      <div className="flex items-center gap-2 mb-2">
        <Badge className="bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30 text-xs">
          Rutina generada
        </Badge>
      </div>
      <p className="font-semibold text-sm mb-2">{routine.name}</p>
      {routine.description && (
        <p className="text-xs text-muted-foreground mb-2">{routine.description}</p>
      )}
      <div className="flex flex-col gap-1.5 mb-3">
        {routine.exercises.map((ex, i) => (
          <div key={i} className="text-xs flex items-center gap-2">
            <span className="text-muted-foreground">{i + 1}.</span>
            <span className="font-medium">{ex.exerciseName}</span>
            <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 text-[10px] shrink-0">
              {ex.muscleGroup}
            </Badge>
            <span className="text-muted-foreground">{ex.sets.length} series</span>
          </div>
        ))}
      </div>
      <Button
        onClick={handleSave}
        disabled={saving}
        size="sm"
        className="bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] h-9 text-xs"
      >
        <Save className="w-3.5 h-3.5 mr-1" />
        Guardar como rutina
      </Button>
    </div>
  )
}

// ─── Save Routine Handler ─────────────────────────────────────────────────────

async function handleSaveRoutine(routine: RoutineJSON) {
  try {
    // For each exercise in the routine, we need to find or create the exercise
    // The API for creating routines expects exerciseId, so we need to:
    // 1. Get user's exercises
    // 2. Match by name or create new ones
    const exercises = await apiGet<any[]>('/exercises')

    const exerciseMap: Record<string, string> = {}
    for (const ex of routine.exercises) {
      const existing = exercises.find(
        (e: any) => e.name.toLowerCase() === ex.exerciseName.toLowerCase()
      )
      if (existing) {
        exerciseMap[ex.exerciseName] = existing.id
      } else {
        // Create the exercise
        const newEx = await apiPost<{ id: string }>('/exercises', {
          name: ex.exerciseName,
          muscleGroup: ex.muscleGroup,
        })
        exerciseMap[ex.exerciseName] = newEx.id
      }
    }

    // Create the routine
    await apiPost('/routines', {
      name: routine.name,
      description: routine.description || null,
      exercises: routine.exercises.map((ex, i) => ({
        exerciseId: exerciseMap[ex.exerciseName],
        order: i,
        setsConfig: ex.sets,
      })),
    })

    toast.success('Rutina guardada correctamente')
  } catch (err: any) {
    toast.error(err.message || 'Error al guardar rutina')
  }
}
