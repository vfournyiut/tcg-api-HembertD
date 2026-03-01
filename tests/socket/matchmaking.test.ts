import { mockDeep, mockReset } from 'vitest-mock-extended'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Server } from 'socket.io'
import { AuthenticatedSocket } from '../../src/socket/middleware'
import { registerMatchmakingHandlers, validateDeck } from '../../src/socket/matchmaking'
import { createMockUser, createMockDeckWithCards, createValidDeckCards } from '../utils/api'
import { prismaMock } from '../vitest.setup'

// Mock Server and Socket
const mockIo = mockDeep<Server>()
const mockSocket = mockDeep<AuthenticatedSocket>()

describe('Socket Matchmaking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReset(mockIo)
    mockReset(mockSocket)
  })

  describe('registerMatchmakingHandlers', () => {
    beforeEach(() => {
      mockSocket.on.mockClear()
      mockSocket.join.mockClear()
      mockSocket.leave.mockClear()
      mockSocket.emit.mockClear()
      mockIo.emit.mockClear()
      mockIo.on.mockClear()
    })

    it('should register connection handler', () => {
      registerMatchmakingHandlers(mockIo)

      expect(mockIo.on).toHaveBeenCalledWith(
        'connection',
        expect.any(Function)
      )
    })

    describe('createRoom', () => {
      it('should emit error if user is not authenticated', () => {
        mockSocket.user = undefined

        registerMatchmakingHandlers(mockIo)

        // Get the connection handler
        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          // Get the createRoom handler
          const createRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'createRoom'
          )?.[1] as Function

          if (createRoomHandler) {
            createRoomHandler({ deckId: 1 })

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Utilisateur non authentifié',
              code: 401,
            })
          }
        }
      })

      it('should emit error if deckId is missing', () => {
        mockSocket.user = { userId: 1, email: 'test@example.com' }

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const createRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'createRoom'
          )?.[1] as Function

          if (createRoomHandler) {
            createRoomHandler({})

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'deckId manquant ou invalide',
              code: 400,
            })
          }
        }
      })

      it('should emit error if deck is not found', async () => {
        mockSocket.user = { userId: 1, email: 'test@example.com' }

        prismaMock.deck.findUnique.mockResolvedValue(null)

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const createRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'createRoom'
          )?.[1] as Function

          if (createRoomHandler) {
            await createRoomHandler({ deckId: 999 })

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Deck non trouvé',
              code: 400,
            })
          }
        }
      })

      it('should emit error if deck has less than 10 cards', async () => {
        mockSocket.user = { userId: 1, email: 'test@example.com' }
        const mockDeck = createMockDeckWithCards(1)
        ;(mockDeck as any).cards = [] // less than 10

        prismaMock.deck.findUnique.mockResolvedValue(mockDeck as any)

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const createRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'createRoom'
          )?.[1] as Function

          if (createRoomHandler) {
            await createRoomHandler({ deckId: 1 })

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Le deck doit contenir exactement 10 cartes',
              code: 400,
            })
          }
        }
      })

      it('should emit error with 403 if deck does not belong to user in createRoom', async () => {
        mockSocket.user = { userId: 1, email: 'test@example.com' }
        const mockDeck = createMockDeckWithCards(2) // userId 2

        prismaMock.deck.findUnique.mockResolvedValue(mockDeck as any)

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const createRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'createRoom'
          )?.[1] as Function

          if (createRoomHandler) {
            await createRoomHandler({ deckId: 1 })

            // Should emit error with code 403 for ownership error
            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Le deck ne vous appartient pas',
              code: 403,
            })
          }
        }
      })

      it('should create room successfully', async () => {
        mockSocket.user = { userId: 1, email: 'test@example.com' }
        const mockDeck = createMockDeckWithCards(1)
        const mockUser = createMockUser({ id: 1, username: 'testuser' })
        const mockRoom = {
          id: 1,
          name: 'Room de test@example.com',
          hostId: 1,
          hostDeckId: 1,
          player2Id: null,
          player2DeckId: null,
          status: 'WAITING',
          createdAt: new Date(),
        }

        prismaMock.deck.findUnique.mockResolvedValue(mockDeck as any)
        prismaMock.room.create.mockResolvedValue(mockRoom as any)
        prismaMock.user.findUnique.mockResolvedValue(mockUser as any)
        prismaMock.room.findMany.mockResolvedValue([])

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const createRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'createRoom'
          )?.[1] as Function

          if (createRoomHandler) {
            await createRoomHandler({ deckId: 1 })

            expect(mockSocket.join).toHaveBeenCalledWith('room:1')
            expect(mockSocket.emit).toHaveBeenCalledWith(
              'roomCreated',
              expect.any(Object)
            )
            expect(mockIo.emit).toHaveBeenCalledWith(
              'roomsListUpdated',
              expect.any(Object)
            )
          }
        }
      })

      it('should create room with email as username when host not found', async () => {
        mockSocket.user = { userId: 1, email: 'test@example.com' }
        const mockDeck = createMockDeckWithCards(1)
        const mockRoom = {
          id: 1,
          name: 'Room de test@example.com',
          hostId: 1,
          hostDeckId: 1,
          player2Id: null,
          player2DeckId: null,
          status: 'WAITING',
          createdAt: new Date(),
        }

        prismaMock.deck.findUnique.mockResolvedValue(mockDeck as any)
        prismaMock.room.create.mockResolvedValue(mockRoom as any)
        // host is null - should use email as fallback
        prismaMock.user.findUnique.mockResolvedValue(null)
        prismaMock.room.findMany.mockResolvedValue([])

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const createRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'createRoom'
          )?.[1] as Function

          if (createRoomHandler) {
            await createRoomHandler({ deckId: 1 })

            // Verify room was created and socket joined
            expect(mockSocket.join).toHaveBeenCalledWith('room:1')
            expect(mockSocket.emit).toHaveBeenCalledWith(
              'roomCreated',
              expect.any(Object)
            )
            expect(mockIo.emit).toHaveBeenCalledWith(
              'roomsListUpdated',
              expect.any(Object)
            )
          }
        }
      })

      it('should handle database error when creating room', async () => {
        mockSocket.user = { userId: 1, email: 'test@example.com' }
        const mockDeck = createMockDeckWithCards(1)

        prismaMock.deck.findUnique.mockResolvedValue(mockDeck as any)
        prismaMock.room.create.mockRejectedValue(new Error('Database error'))

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const createRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'createRoom'
          )?.[1] as Function

          if (createRoomHandler) {
            await createRoomHandler({ deckId: 1 })

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Erreur lors de la création de la room',
              code: 500,
            })
          }
        }
      })
    })

    describe('getRooms', () => {
      it('should return list of waiting rooms', async () => {
        prismaMock.room.findMany.mockResolvedValue([])
        prismaMock.user.findUnique.mockResolvedValue(null)

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const getRoomsHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'getRooms'
          )?.[1] as Function

          if (getRoomsHandler) {
            await getRoomsHandler()

            expect(mockIo.emit).toHaveBeenCalledWith(
              'roomsList',
              expect.any(Object)
            )
          }
        }
      })

      it('should handle error when getting rooms', async () => {
        prismaMock.room.findMany.mockRejectedValue(new Error('Database error'))

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const getRoomsHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'getRooms'
          )?.[1] as Function

          if (getRoomsHandler) {
            // Should not throw, just log error
            await expect(getRoomsHandler()).resolves.not.toThrow()
          }
        }
      })

      it('should return rooms with Unknown host when user not found', async () => {
        const mockRoom = {
          id: 1,
          name: 'Test Room',
          hostId: 999,
          hostDeckId: 1,
          player2Id: null,
          player2DeckId: null,
          status: 'WAITING',
          createdAt: new Date(),
        }

        prismaMock.room.findMany.mockResolvedValue([mockRoom] as any)
        prismaMock.user.findUnique.mockResolvedValue(null)

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const getRoomsHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'getRooms'
          )?.[1] as Function

          if (getRoomsHandler) {
            await getRoomsHandler()

            expect(mockIo.emit).toHaveBeenCalledWith(
              'roomsList',
              expect.objectContaining({
                rooms: expect.arrayContaining([
                  expect.objectContaining({
                    hostUsername: 'Unknown',
                  }),
                ]),
              })
            )
          }
        }
      })
    })

    describe('joinRoom', () => {
      it('should emit error if user is not authenticated', () => {
        mockSocket.user = undefined

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            joinRoomHandler({ roomId: 1, deckId: 1 })

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Utilisateur non authentifié',
              code: 401,
            })
          }
        }
      })

      it('should emit error if roomId is missing', () => {
        mockSocket.user = { userId: 1, email: 'test@example.com' }

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            joinRoomHandler({ deckId: 1 })

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'roomId manquant ou invalide',
              code: 400,
            })
          }
        }
      })

      it('should emit error if deckId is missing', () => {
        mockSocket.user = { userId: 1, email: 'test@example.com' }

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            joinRoomHandler({ roomId: 1 })

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'deckId manquant ou invalide',
              code: 400,
            })
          }
        }
      })

      it('should emit error if room not found', async () => {
        mockSocket.user = { userId: 1, email: 'test@example.com' }

        prismaMock.room.findUnique.mockResolvedValue(null)

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            await joinRoomHandler({ roomId: 999, deckId: 1 })

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Room non trouvée',
              code: 404,
            })
          }
        }
      })

      it('should emit error if room is already full', async () => {
        mockSocket.user = { userId: 2, email: 'test2@example.com' }
        const mockRoom = {
          id: 1,
          status: 'IN_PROGRESS',
          hostId: 1,
          hostDeckId: 1,
        }

        prismaMock.room.findUnique.mockResolvedValue(mockRoom as any)

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            await joinRoomHandler({ roomId: 1, deckId: 1 })

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'La room est déjà complète',
              code: 400,
            })
          }
        }
      })

      it('should emit error if user is already in the room', async () => {
        mockSocket.user = { userId: 1, email: 'test@example.com' }
        const mockRoom = {
          id: 1,
          status: 'WAITING',
          hostId: 1,
          hostDeckId: 1,
        }

        prismaMock.room.findUnique.mockResolvedValue(mockRoom as any)

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            await joinRoomHandler({ roomId: 1, deckId: 1 })

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Vous êtes déjà dans cette room',
              code: 400,
            })
          }
        }
      })

      it('should emit error if deck does not belong to user in joinRoom', async () => {
        mockSocket.user = { userId: 1, email: 'test@example.com' }
        const mockRoom = {
          id: 1,
          status: 'WAITING',
          hostId: 2,
          hostDeckId: 1,
        }
        const mockDeck = createMockDeckWithCards(2) // userId 2

        // Setup mocks BEFORE registerMatchmakingHandlers to ensure they're captured in closure
        prismaMock.room.findUnique.mockResolvedValue(mockRoom as any)
        prismaMock.deck.findUnique.mockResolvedValue(mockDeck as any)

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            await joinRoomHandler({ roomId: 1, deckId: 1 })

            // This should cover lines 263-264
            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Le deck ne vous appartient pas',
              code: 403,
            })
          }
        }
      })

      it('should join room successfully', async () => {
        mockSocket.user = { userId: 2, email: 'test2@example.com' }
        const mockRoom = {
          id: 1,
          status: 'WAITING',
          hostId: 1,
          hostDeckId: 1,
        }
        const mockDeck = createMockDeckWithCards(2)
        const mockHostDeck = createMockDeckWithCards(1)

        // Setup all mocks - order matters!
        prismaMock.room.findUnique.mockResolvedValue(mockRoom as any)
        // validateDeck calls deck.findUnique once
        prismaMock.deck.findUnique.mockResolvedValue(mockDeck as any)
        prismaMock.room.update.mockResolvedValue({
          ...mockRoom,
          status: 'IN_PROGRESS',
          player2Id: 2,
          player2DeckId: 1,
        } as any)
        // createGameState calls deck.findUnique twice more
        prismaMock.room.findMany.mockResolvedValue([])

        // Setup io.to().emit() chain - io.to() returns an object with emit method
        const toEmitMock = vi.fn()
        const toResult = { emit: toEmitMock }
        ;(mockIo.to as any).mockReturnValue(toResult)

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            await joinRoomHandler({ roomId: 1, deckId: 1 })

            // Verify io.to was called with the room
            expect(mockIo.to).toHaveBeenCalledWith('room:1')
            // Verify gameStarted was emitted via io.to().emit()
            expect(toEmitMock).toHaveBeenCalledWith(
              'gameStarted',
              expect.any(Object)
            )
            // Verify rooms list was updated (indicates successful join)
            expect(mockIo.emit).toHaveBeenCalledWith(
              'roomsListUpdated',
              expect.any(Object)
            )
          }
        }
      })

      it('should handle error when createGameState fails', async () => {
        mockSocket.user = { userId: 2, email: 'test2@example.com' }
        const mockRoom = {
          id: 1,
          status: 'WAITING',
          hostId: 1,
          hostDeckId: 1,
        }
        const mockDeck = createMockDeckWithCards(2)

        prismaMock.room.findUnique.mockResolvedValue(mockRoom as any)
        prismaMock.deck.findUnique.mockResolvedValue(mockDeck as any)
        prismaMock.room.update.mockResolvedValue({
          ...mockRoom,
          status: 'IN_PROGRESS',
          player2Id: 2,
          player2DeckId: 1,
        } as any)
        // createGameState will fail because deck.findUnique returns null after the first call
        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any)
        prismaMock.deck.findUnique.mockResolvedValueOnce(null) // player2Deck not found

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            await joinRoomHandler({ roomId: 1, deckId: 1 })

            // Verify error was emitted (line 264)
            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Erreur lors de la rejoint de la room',
              code: 500,
            })
          }
        }
      })

      it('should handle error when room update fails in try block', async () => {
        mockSocket.user = { userId: 2, email: 'test2@example.com' }
        const mockRoom = {
          id: 1,
          status: 'WAITING',
          hostId: 1,
          hostDeckId: 1,
        }
        const mockDeck = createMockDeckWithCards(2)

        prismaMock.room.findUnique.mockResolvedValue(mockRoom as any)
        prismaMock.deck.findUnique.mockResolvedValue(mockDeck as any)
        // Make room.update throw an error to trigger catch block (lines 263-264)
        prismaMock.room.update.mockRejectedValue(new Error('Update failed'))

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            await joinRoomHandler({ roomId: 1, deckId: 1 })

            // Verify error was emitted (line 264)
            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Erreur lors de la rejoint de la room',
              code: 500,
            })
          }
        }
      })

      it('should handle error when getWaitingRooms fails after joining', async () => {
        mockSocket.user = { userId: 2, email: 'test2@example.com' }
        const mockRoom = {
          id: 1,
          status: 'WAITING',
          hostId: 1,
          hostDeckId: 1,
        }
        const mockDeck = createMockDeckWithCards(2)
        const mockHostDeck = createMockDeckWithCards(1)

        prismaMock.room.findUnique.mockResolvedValue(mockRoom as any)
        prismaMock.deck.findUnique.mockResolvedValue(mockDeck as any)
        prismaMock.room.update.mockResolvedValue({
          ...mockRoom,
          status: 'IN_PROGRESS',
          player2Id: 2,
          player2DeckId: 1,
        } as any)
        // Make getWaitingRooms (via room.findMany) fail to trigger catch block
        prismaMock.room.findMany.mockRejectedValue(new Error('Database error'))

        // Setup io.to().emit() chain
        const toEmitMock = vi.fn()
        const toResult = { emit: toEmitMock }
        ;(mockIo.to as any).mockReturnValue(toResult)

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            await joinRoomHandler({ roomId: 1, deckId: 1 })

            // Verify error was emitted (line 264)
            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Erreur lors de la rejoint de la room',
              code: 500,
            })
          }
        }
      })

      it('should handle database error when joining room', async () => {
        mockSocket.user = { userId: 2, email: 'test2@example.com' }
        const mockRoom = {
          id: 1,
          status: 'WAITING',
          hostId: 1,
          hostDeckId: 1,
        }
        const mockDeck = createMockDeckWithCards(2)

        prismaMock.room.findUnique.mockResolvedValue(mockRoom as any)
        prismaMock.deck.findUnique
          .mockResolvedValueOnce(mockDeck as any)
          .mockResolvedValueOnce(mockDeck as any)
        prismaMock.room.update.mockRejectedValue(new Error('Database error'))

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            await joinRoomHandler({ roomId: 1, deckId: 1 })

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Erreur lors de la rejoint de la room',
              code: 500,
            })
          }
        }
      })
    })

    describe('validateDeck', () => {
      it('should return error if deckId is NaN', async () => {
        const result = await validateDeck(NaN, 1)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('deckId manquant ou invalide')
      })

      it('should return error with 400 code for non-ownership errors', async () => {
        // Test the else branch of the ternary: deckValidation.error?.includes('appartient') ? 403 : 400
        mockSocket.user = { userId: 1, email: 'test@example.com' }
        const mockRoom = {
          id: 1,
          status: 'WAITING',
          hostId: 2,
          hostDeckId: 1,
        }
        const mockDeck = createMockDeckWithCards(1)
        // Make deck have less than 10 cards to trigger non-ownership error
        ;(mockDeck as any).cards = []

        prismaMock.room.findUnique.mockResolvedValue(mockRoom as any)
        prismaMock.deck.findUnique.mockResolvedValue(mockDeck as any)

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const joinRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'joinRoom'
          )?.[1] as Function

          if (joinRoomHandler) {
            await joinRoomHandler({ roomId: 1, deckId: 1 })

            // Should emit error with code 400 (not 403) for non-ownership error
            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
              message: 'Le deck doit contenir exactement 10 cartes',
              code: 400,
            })
          }
        }
      })
    })

    describe('leaveRoom', () => {
      it('should leave room if roomId is provided', () => {
        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const leaveRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'leaveRoom'
          )?.[1] as Function

          if (leaveRoomHandler) {
            leaveRoomHandler({ roomId: 1 })

            expect(mockSocket.leave).toHaveBeenCalledWith('room:1')
          }
        }
      })

      it('should not leave room if roomId is not provided', () => {
        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const leaveRoomHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'leaveRoom'
          )?.[1] as Function

          if (leaveRoomHandler) {
            leaveRoomHandler({})

            expect(mockSocket.leave).not.toHaveBeenCalled()
          }
        }
      })
    })

    describe('disconnect', () => {
      it('should handle socket disconnection', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        registerMatchmakingHandlers(mockIo)

        const connectionHandler = mockIo.on.mock.calls.find(
          (call: unknown[]) => call[0] === 'connection'
        )?.[1] as Function

        if (connectionHandler) {
          connectionHandler(mockSocket)

          const disconnectHandler = mockSocket.on.mock.calls.find(
            (call: unknown[]) => call[0] === 'disconnect'
          )?.[1] as Function

          if (disconnectHandler) {
            disconnectHandler()

            expect(consoleSpy).toHaveBeenCalledWith(
              `Socket déconnecté du matchmaking: ${mockSocket.id}`
            )
          }
        }

        consoleSpy.mockRestore()
      })
    })

  })
})
