'use client'

import React, { createContext, useContext } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>
  signUp: (email: string, password: string) => Promise<{ success: boolean; user?: User; message?: string; error?: string }>
  signOut: () => Promise<{ success: boolean; error?: string }>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ success: boolean; error?: string }>
  refreshAuth: () => Promise<void>
  isAuthenticated: boolean
  userId: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}