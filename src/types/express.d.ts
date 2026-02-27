import 'express'

declare module 'express' {
  interface Request {
    user?: {
      userId: number
      email: string
    }
  }
}

// Extension des types pour Socket.io
import 'socket.io'

declare module 'socket.io' {
  interface Socket {
    user?: {
      userId: number
      email: string
    }
  }
}
