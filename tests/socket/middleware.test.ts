import { mockDeep, mockReset } from 'vitest-mock-extended'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { socketAuthMiddleware, AuthenticatedSocket } from '../../src/socket/middleware'
import { env } from '../../src/env'

vi.mock('jsonwebtoken')
vi.mock('../../src/env', () => ({
  env: { JWT_SECRET: 'test-secret' }
}))

const mockJwt = jwt as any
const mockSocket = mockDeep<AuthenticatedSocket>()
const mockNext = vi.fn()

beforeEach(() => {
  mockReset(mockSocket)
  mockNext.mockClear()
  mockJwt.verify.mockClear()
})

describe('socketAuthMiddleware', () => {
  it('should call next with error if no token', () => {
    mockSocket.handshake.auth.token = undefined

    socketAuthMiddleware(mockSocket, mockNext)

    expect(mockNext).toHaveBeenCalledWith(new Error('Token manquant'))
  })

  it('should call next with error if invalid token', () => {
    mockSocket.handshake.auth.token = 'invalid'

    mockJwt.verify.mockImplementation(() => {
      throw new Error('invalid')
    })

    socketAuthMiddleware(mockSocket, mockNext)

    expect(mockNext).toHaveBeenCalledWith(new Error('Token invalide ou expiré'))
  })

  it('should set socket.user and call next if valid token', () => {
    const token = 'valid'
    const decoded = { userId: 1, email: 'test@example.com' }

    mockSocket.handshake.auth.token = token

    mockJwt.verify.mockReturnValue(decoded)

    socketAuthMiddleware(mockSocket, mockNext)

    expect(mockJwt.verify).toHaveBeenCalledWith(token, env.JWT_SECRET)
    expect(mockSocket.user).toEqual(decoded)
    expect(mockNext).toHaveBeenCalledWith()
  })
})
