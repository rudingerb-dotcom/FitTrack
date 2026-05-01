'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Dumbbell, Mail, Lock, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiPost } from '@/lib/api-helpers'

interface AuthScreenProps {
  onSuccess?: () => void
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'register') {
      if (!name.trim()) {
        setError('El nombre es requerido')
        return
      }
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres')
        return
      }

      setLoading(true)
      try {
        await apiPost('/auth/register', { email, password, name })
        // After successful registration, sign in
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })
        if (result?.error) {
          setError(result.error)
        } else {
          onSuccess?.()
        }
      } catch (err: any) {
        setError(err.message || 'Error al crear la cuenta')
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(true)
      try {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })
        if (result?.error) {
          setError('Email o contraseña incorrectos')
        } else {
          onSuccess?.()
        }
      } catch (err: any) {
        setError(err.message || 'Error al iniciar sesión')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6 overflow-hidden bg-[#0a0a0a]">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-[radial-gradient(circle,rgba(34,197,94,0.08)_0%,transparent_60%)]" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-[radial-gradient(circle,rgba(34,197,94,0.05)_0%,transparent_60%)]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center green-glow">
            <Dumbbell className="w-10 h-10 text-[#22c55e]" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-green">FitTrack</h1>
          <p className="text-muted-foreground text-sm">
            Tu compañero de entrenamiento
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 pl-11 text-lg bg-[#141414] border-[#2a2a2a] rounded-xl placeholder:text-muted-foreground/60"
                required={mode === 'register'}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 pl-11 text-lg bg-[#141414] border-[#2a2a2a] rounded-xl placeholder:text-muted-foreground/60"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 pl-11 text-lg bg-[#141414] border-[#2a2a2a] rounded-xl placeholder:text-muted-foreground/60"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-14 text-lg font-semibold rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-[#050f09] green-glow-strong"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === 'login' ? (
              'Iniciar Sesión'
            ) : (
              'Registrarse'
            )}
          </Button>
        </form>

        {/* Toggle */}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
          className="text-muted-foreground text-sm"
        >
          {mode === 'login' ? (
            <>
              ¿No tienes cuenta?{' '}
              <span className="text-[#22c55e] font-medium">Regístrate</span>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <span className="text-[#22c55e] font-medium">Inicia sesión</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
