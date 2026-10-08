"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  linkWithCredential,
  linkWithPopup,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth"
import { appFirebase, googleProvider } from "@/lib/firebase"
import { isDemoMode } from "@/lib/demo/mode"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInAnonymously: () => Promise<void>
  /** Convierte la sesión de invitado en cuenta real conservando uid y datos. */
  linkGuestWithEmail: (email: string, password: string) => Promise<void>
  linkGuestWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // El enlace invitado→cuenta muta el mismo objeto User (isAnonymous, email):
  // forzamos un render para que la UI lo refleje.
  const [, setAuthVersion] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = appFirebase.auth
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    // En modo demo no hay Firebase Admin: no se emite cookie de servidor.
    if (loading || isDemoMode()) return
    if (!user) {
      void fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
      })
      return
    }
    void (async () => {
      try {
        const idToken = await user.getIdToken(true)
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "include",
        })
      } catch {
        // p. ej. admin no configurado o sin red
      }
    })()
  }, [user, loading])

  const signIn = async (email: string, password: string) => {
    const auth = appFirebase.auth
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code))
    }
  }

  const signUp = async (email: string, password: string) => {
    const auth = appFirebase.auth
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code))
    }
  }

  const signInWithGoogle = async () => {
    const auth = appFirebase.auth
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code))
    }
  }

  const signInAnonymously = async () => {
    const auth = appFirebase.auth
    try {
      await firebaseSignInAnonymously(auth)
    } catch (error: any) {
      throw new Error("No se pudo iniciar sesión como invitado")
    }
  }

  const linkGuestWithEmail = async (email: string, password: string) => {
    const current = appFirebase.auth.currentUser
    if (!current?.isAnonymous) throw new Error("No hay una sesión de invitado activa")
    try {
      await linkWithCredential(current, EmailAuthProvider.credential(email, password))
      setAuthVersion((v) => v + 1)
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code))
    }
  }

  const linkGuestWithGoogle = async () => {
    const current = appFirebase.auth.currentUser
    if (!current?.isAnonymous) throw new Error("No hay una sesión de invitado activa")
    try {
      await linkWithPopup(current, googleProvider)
      setAuthVersion((v) => v + 1)
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code))
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(appFirebase.auth, email)
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code))
    }
  }

  const logout = async () => {
    const auth = appFirebase.auth
    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
      })
      await signOut(auth)
    } catch (error: any) {
      throw new Error("Error al cerrar sesión")
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInAnonymously,
    linkGuestWithEmail,
    linkGuestWithGoogle,
    resetPassword,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/user-not-found":
      return "No existe una cuenta con este correo electrónico"
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos"
    case "auth/credential-already-in-use":
    case "auth/provider-already-linked":
      return "Esa cuenta ya existe. Inicia sesión con ella (los datos del invitado no se fusionan)."
    case "auth/operation-not-allowed":
      return "Este método de acceso no está habilitado en Firebase"
    case "auth/network-request-failed":
      return "Sin conexión. Revisa tu red e inténtalo de nuevo"
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con este correo electrónico"
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres"
    case "auth/invalid-email":
      return "Correo electrónico inválido"
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Intenta más tarde"
    case "auth/popup-closed-by-user":
      return "Inicio de sesión cancelado"
    default:
      return "Error de autenticación. Intenta nuevamente"
  }
}
