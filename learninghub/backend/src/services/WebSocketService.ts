import { Server as SocketIOServer, Socket } from 'socket.io'
import logger from '../utils/logger'

export interface ClientConnectionStats {
  userId: string
  socketId: string
  connectedAt: Date
  lastPingAt: Date
  isAlive: boolean
}

export class WebSocketService {
  private io: SocketIOServer | null = null
  private clients = new Map<string, ClientConnectionStats>() // socketId -> stats
  private heartbeatInterval: NodeJS.Timeout | null = null
  private readonly PING_INTERVAL_MS = 30000 // 30 seconds
  private readonly PING_TIMEOUT_MS = 10000 // 10 seconds tolerance

  public setSocketIO(io: SocketIOServer): void {
    this.io = io
    logger.info('[WebSocketService] Socket.io Server instance attached.')
    this.startHeartbeatMonitor()
  }

  public registerSocket(socket: Socket): void {
    const userId = socket.data?.userId || 'anonymous'
    this.clients.set(socket.id, {
      userId,
      socketId: socket.id,
      connectedAt: new Date(),
      lastPingAt: new Date(),
      isAlive: true,
    })

    // Listen for custom heartbeat pong from client
    socket.on('pong-heartbeat', () => {
      const client = this.clients.get(socket.id)
      if (client) {
        client.isAlive = true
        client.lastPingAt = new Date()
      }
    })

    socket.on('disconnect', () => {
      this.unregisterSocket(socket.id)
    })
  }

  public unregisterSocket(socketId: string): void {
    this.clients.delete(socketId)
  }

  public getActiveConnectionsCount(): number {
    return this.clients.size
  }

  public getClientStats(socketId: string): ClientConnectionStats | undefined {
    return this.clients.get(socketId)
  }

  public startHeartbeatMonitor(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      if (!this.io) return

      const now = Date.now()
      this.clients.forEach((client, socketId) => {
        // If client failed to respond to previous ping within timeout period, terminate
        if (
          !client.isAlive ||
          now - client.lastPingAt.getTime() > this.PING_INTERVAL_MS + this.PING_TIMEOUT_MS
        ) {
          logger.warn(
            `[WebSocketService] Pruning dead or unresponsive socket: ${socketId} (User: ${client.userId})`
          )
          const socket = this.io?.sockets.sockets.get(socketId)
          if (socket) {
            socket.disconnect(true)
          }
          this.unregisterSocket(socketId)
          return
        }

        // Mark as waiting for pong and emit ping
        client.isAlive = false
        const socket = this.io?.sockets.sockets.get(socketId)
        if (socket) {
          socket.emit('ping-heartbeat', { timestamp: now })
        } else {
          this.unregisterSocket(socketId)
        }
      })
    }, this.PING_INTERVAL_MS)

    // Unref interval so it doesn't block node process exit in tests
    if (this.heartbeatInterval && typeof this.heartbeatInterval.unref === 'function') {
      this.heartbeatInterval.unref()
    }
  }

  public stopHeartbeatMonitor(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  public notifyUser(userId: string, eventName: string, payload: unknown): void {
    if (!this.io) {
      logger.warn(`[WebSocketService] Failed to notify user ${userId}. Service not initialized.`)
      return
    }
    // Note: User room in websockets/index.ts is joined as precisely userId
    this.io.to(userId).emit(eventName, payload)
    logger.debug(`[WebSocket] Emitted '${eventName}' to User ${userId}`)
  }

  public broadcastAdmin(eventName: string, payload: unknown): void {
    if (!this.io) return
    this.io.to('admin_dashboard').emit(eventName, payload)
  }

  public broadcast(eventName: string, payload: unknown): void {
    if (!this.io) return
    this.io.emit(eventName, payload)
  }
}

export const webSocketService = new WebSocketService()
