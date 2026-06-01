import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket-events'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export function useSocket(): AppSocket {
  const ref = useRef<AppSocket | null>(null)
  if (!ref.current) {
    const url = import.meta.env.DEV
      ? `http://${window.location.hostname}:3001`
      : undefined
    ref.current = io(url, { autoConnect: true }) as AppSocket
  }
  useEffect(() => {
    return () => {
      ref.current?.disconnect()
      ref.current = null
    }
  }, [])
  return ref.current
}
