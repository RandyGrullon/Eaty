"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { WifiOff, Wifi } from "lucide-react"

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineMessage(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineMessage(true)
    }

    // Set initial state
    setIsOnline(navigator.onLine)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Auto-hide offline message after coming back online
  useEffect(() => {
    if (isOnline && showOfflineMessage) {
      const timer = setTimeout(() => {
        setShowOfflineMessage(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, showOfflineMessage])

  if (!showOfflineMessage && isOnline) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4" role="status" aria-live="polite">
      <div
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-soft",
          isOnline ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"
        )}
      >
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            Conexión restaurada
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            Sin conexión: modo offline
          </>
        )}
      </div>
    </div>
  )
}
