import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Server, Socket } from 'socket.io';

import {
  emitGameState,
  getClientGameState,
  getCurrentPlayer,
  getGameState,
  getOpponent,
  getRoomIdBySocket,
  handleAttack,
  handleDrawCards,
  handleEndTurn,
  handlePlayCard,
  handlePlayerDisconnect,
  initializeGame,
  registerGameHandlers,
  resetAllGames,
  updateGameUserIds,
} from '../../src/socket/game';
import type {
  ActiveCard,
  ClientGameState,
  EndTurnPayload,
  GameCard,
  PlayCardPayload,
  ServerGameState,
} from '../../src/types/room';
import { AuthenticatedSocket } from '../../src/socket/middleware';

// Mock des dépendances
vi.mock('../../src/utils/rules.util', () => ({
  calculateDamage: vi.fn().mockReturnValue(50),
}));

// Mock du middleware
vi.mock('../../src/socket/middleware', () => ({
  AuthenticatedSocket: class extends Socket {
    user?: { userId: number; email: string };
  },
}));

describe('Socket Game', () => {
  let mockIo: Server;
  let mockSocket: AuthenticatedSocket;
  let mockSocket2: AuthenticatedSocket;

  const createMockSocket = (id: string, userId: number): AuthenticatedSocket => {
    const socket = {
      id,
      user: { userId, email: `user${userId}@example.com` },
      emit: vi.fn(),
      on: vi.fn(),
    } as unknown as AuthenticatedSocket;
    return socket;
  };

  beforeEach(() => {
    mockIo = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as unknown as Server;

    mockSocket = createMockSocket('socket_host', 1);
    mockSocket2 = createMockSocket('socket_player2', 2);
  });

  describe('initializeGame', () => {
    it('should create a new game state with correct initial values', () => {
      const hostDeck: GameCard[] = [
        { id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null },
        { id: 2, name: 'Charmander', hp: 90, attack: 40, type: 'Fire', pokedexNumber: 4, imgUrl: null },
      ];

      const player2Deck: GameCard[] = [
        { id: 3, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null },
        { id: 4, name: 'Bulbasaur', hp: 85, attack: 38, type: 'Grass', pokedexNumber: 1, imgUrl: null },
      ];

      const gameState = initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      expect(gameState.roomId).toBe(1);
      expect(gameState.host.socketId).toBe('socket_host');
      expect(gameState.player2.socketId).toBe('socket_player2');
      expect(gameState.host.hand).toEqual([]);
      expect(gameState.player2.hand).toEqual([]);
      expect(gameState.host.deck).toEqual(hostDeck);
      expect(gameState.player2.deck).toEqual(player2Deck);
      expect(gameState.host.activeCard).toBeNull();
      expect(gameState.player2.activeCard).toBeNull();
      expect(gameState.host.score).toBe(0);
      expect(gameState.player2.score).toBe(0);
      expect(gameState.currentPlayerSocketId).toBe('socket_host');
      expect(gameState.turnNumber).toBe(1);
      expect(gameState.gameStatus).toBe('PLAYING');
      expect(gameState.winner).toBeNull();
    });
  });

  describe('updateGameUserIds', () => {
    it('should update user IDs in game state', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      updateGameUserIds(1, 100, 200);

      const gameState = getGameState(1);
      expect(gameState?.host.userId).toBe(100);
      expect(gameState?.player2.userId).toBe(200);
    });

    it('should handle FALSE branch when game does not exist (line 71)', () => {
      // FALSE branch: game is undefined (no game exists for this roomId)
      // Should not throw, just return silently
      expect(() => updateGameUserIds(99999, 100, 200)).not.toThrow();
    });
  });

  describe('Helper functions - getCurrentPlayer and getOpponent', () => {
    it('should cover getCurrentPlayer helper with isHost=false (line 378)', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      const serverState = initializeGame(200, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      
      // Test getCurrentPlayer with isHost=false (line 378) - else branch
      const currentPlayer = getCurrentPlayer(serverState, false);
      expect(currentPlayer.socketId).toBe('socket_player2');
      expect(currentPlayer.userId).toBe(0);
      
      // Test getOpponent with isHost=false - else branch
      const opponent = getOpponent(serverState, false);
      expect(opponent.socketId).toBe('socket_host');
    });

    it('should cover helper functions with isHost=true', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      const serverState = initializeGame(201, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      
      // Test getCurrentPlayer with isHost=true - if branch
      const currentPlayer = getCurrentPlayer(serverState, true);
      expect(currentPlayer.socketId).toBe('socket_host');
      
      // Test getOpponent with isHost=true - if branch
      const opponent = getOpponent(serverState, true);
      expect(opponent.socketId).toBe('socket_player2');
    });

    it('should directly test getCurrentPlayer else branch for line 378 coverage', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      const serverState = initializeGame(202, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      
      // Direct test of else branch - isHost=false
      const result = getCurrentPlayer(serverState, false);
      expect(result).toBe(serverState.player2);
    });

    it('should directly test getOpponent else branch', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      const serverState = initializeGame(203, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      
      // Direct test of else branch - isHost=false
      const result = getOpponent(serverState, false);
      expect(result).toBe(serverState.host);
    });
  });

  describe('getClientGameState', () => {
    it('should return filtered game state for host', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      const serverState = initializeGame(100, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      updateGameUserIds(100, 100, 200);

      const clientState = getClientGameState(serverState, 'host');

      expect(clientState.gameId).toBe(100);
      expect(clientState.roomId).toBe(100);
      expect(clientState.player).toBe('host');
      expect(clientState.hand).toEqual([]);
      expect(clientState.handSize).toBe(0);
      expect(clientState.deckSize).toBe(1);
      expect(clientState.activeCard).toBeNull();
      expect(clientState.score).toBe(0);
      expect(clientState.opponentHandSize).toBe(0);
      expect(clientState.opponentDeckSize).toBe(1);
      expect(clientState.opponentActiveCard).toBeNull();
      expect(clientState.opponentScore).toBe(0);
      expect(clientState.currentTurn).toBe('host');
      expect(clientState.currentPlayerSocketId).toBe('socket_host');
      expect(clientState.isMyTurn).toBe(true);
      expect(clientState.turnNumber).toBe(1);
      expect(clientState.gameStatus).toBe('PLAYING');
      expect(clientState.winner).toBeNull();
    });

    it('should return filtered game state for player2 covering else branches line 365', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      const serverState = initializeGame(101, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      updateGameUserIds(101, 100, 200);

      // This test covers the else branches in getClientGameState (line 365)
      // where isHost is FALSE, so currentPlayer = serverState.player2 and opponent = serverState.host
      const clientState = getClientGameState(serverState, 'player2');

      expect(clientState.player).toBe('player2');
      expect(clientState.isMyTurn).toBe(false);
      expect(clientState.currentTurn).toBe('host');
      // Verify player2's data is returned (from else branch of currentPlayer)
      expect(clientState.deckSize).toBe(1); // player2's deck
      // Verify host's data is returned as opponent (from else branch of opponent - line 365)
      expect(clientState.opponentDeckSize).toBe(1); // host's deck
      expect(clientState.opponentActiveCard).toBeNull(); // host's active card
    });

    it('should explicitly cover line 365 else branch for opponent assignment', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      const serverState = initializeGame(103, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      
      // Set different values to distinguish host vs player2 data
      serverState.host.hand = [{ ...hostDeck[0] }];
      serverState.player2.hand = [];
      serverState.host.activeCard = { ...hostDeck[0], currentHp: 80 };
      serverState.player2.activeCard = null;
      serverState.host.score = 5;
      serverState.player2.score = 3;

      // Call getClientGameState with player2 to trigger else branches
      const clientState = getClientGameState(serverState, 'player2');

      // Verify the else branch was taken: opponent should be serverState.host
      expect(clientState.opponentHandSize).toBe(1); // host has 1 card in hand
      expect(clientState.opponentActiveCard).not.toBeNull(); // host has active card
      expect(clientState.opponentScore).toBe(5); // host score is 5
      expect(clientState.handSize).toBe(0); // player2 has 0 cards
      expect(clientState.score).toBe(3); // player2 score is 3
    });

    it('should show currentTurn as player2 when it is player2 turn', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      const serverState = initializeGame(102, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      serverState.currentPlayerSocketId = 'socket_player2';

      const clientState = getClientGameState(serverState, 'host');

      expect(clientState.currentTurn).toBe('player2');
      expect(clientState.isMyTurn).toBe(false);
    });
  });

  describe('emitGameState', () => {
    it('should emit game state to both players', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      const serverState = initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      emitGameState(mockIo, 1, serverState);

      expect(mockIo.to).toHaveBeenCalledWith('socket_host');
      expect(mockIo.to).toHaveBeenCalledWith('socket_player2');
      expect(mockIo.emit).toHaveBeenCalledTimes(2);
      expect(mockIo.emit).toHaveBeenCalledWith('gameStateUpdated', expect.any(Object));
    });
  });

  describe('getGameState', () => {
    it('should return game state for existing room', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      const gameState = getGameState(1);
      expect(gameState).toBeDefined();
      expect(gameState?.roomId).toBe(1);
    });

    it('should return undefined for non-existing room', () => {
      const gameState = getGameState(999);
      expect(gameState).toBeUndefined();
    });
  });

  describe('getRoomIdBySocket', () => {
    it('should return room ID for socket', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      expect(getRoomIdBySocket('socket_host')).toBe(1);
      expect(getRoomIdBySocket('socket_player2')).toBe(1);
    });

    it('should return undefined for unknown socket', () => {
      expect(getRoomIdBySocket('unknown_socket')).toBeUndefined();
    });
  });

  describe('handleDrawCards', () => {
    it('should execute TRUE branch of turn check - not player turn', async () => {
      const hostDeck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Card ${i + 1}`,
        hp: 100,
        attack: 50,
        type: 'Electric',
        pokedexNumber: i + 1,
        imgUrl: null,
      }));

      const player2Deck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 11,
        name: `Card ${i + 11}`,
        hp: 100,
        attack: 50,
        type: 'Water',
        pokedexNumber: i + 11,
        imgUrl: null,
      }));

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // TRUE branch: currentPlayerSocketId !== socket.id (not player turn)
      await handleDrawCards(mockSocket2, mockIo);

      expect(mockSocket2.emit).toHaveBeenCalledWith('error', {
        message: 'Ce n\'est pas votre tour',
        code: 403,
      });
    });

    it('should execute FALSE branch of turn check - is player turn', async () => {
      const hostDeck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Card ${i + 1}`,
        hp: 100,
        attack: 50,
        type: 'Electric',
        pokedexNumber: i + 1,
        imgUrl: null,
      }));

      const player2Deck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 11,
        name: `Card ${i + 11}`,
        hp: 100,
        attack: 50,
        type: 'Water',
        pokedexNumber: i + 11,
        imgUrl: null,
      }));

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // FALSE branch: currentPlayerSocketId === socket.id (is player turn)
      const gameState = getGameState(1);
      
      await handleDrawCards(mockSocket, mockIo);

      // Verify success - cards drawn
      expect(gameState?.host.hand.length).toBe(5);
    });

    it('should return error if game state not found (socket not in any game)', async () => {
      // Create a mock socket that is not in any game
      const fakeSocket = createMockSocket('socket_fake_no_game', 3);
      
      await handleDrawCards(fakeSocket, mockIo);
      
      // Should emit error because socket not in any game
      expect(fakeSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
    });

    it('should return error if room found but game state missing', async () => {
      // This tests the case where socketToRoom has an entry but activeGames doesn't
      const { __test__createOrphanedSocketMapping } = await import('../../src/socket/game');
      
      // Create orphaned mapping - socket is mapped to room 9999 but no game exists
      __test__createOrphanedSocketMapping('socket_orphan_draw', 9999);
      
      const orphanSocket = createMockSocket('socket_orphan_draw', 3);
      await handleDrawCards(orphanSocket, mockIo);
      
      // Should emit "Partie non trouvée" because roomId was found but game doesn't exist
      expect(orphanSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Partie non trouvée',
        code: 404,
      });
    });

    it('should return error if game exists but socket not in game', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];
      
      // Initialize game with specific sockets
      initializeGame(888, 'socket_host_888', 'socket_p2_888', hostDeck, player2Deck);
      
      // Create a socket with different ID that is not in the game
      const unknownSocket = createMockSocket('socket_unknown_888', 3);
      
      await handleDrawCards(unknownSocket, mockIo);
      
      // Should emit error because socket not in any game
      expect(unknownSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
    });

    it('should draw cards up to 5 when it is player turn', async () => {
      const hostDeck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Card ${i + 1}`,
        hp: 100,
        attack: 50,
        type: 'Electric',
        pokedexNumber: i + 1,
        imgUrl: null,
      }));

      const player2Deck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 11,
        name: `Card ${i + 11}`,
        hp: 100,
        attack: 50,
        type: 'Water',
        pokedexNumber: i + 11,
        imgUrl: null,
      }));

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Verify it's host's turn (currentPlayerSocketId === socket_host)
      const gameStateBefore = getGameState(1);
      expect(gameStateBefore?.currentPlayerSocketId).toBe('socket_host');

      await handleDrawCards(mockSocket, mockIo);

      const gameState = getGameState(1);
      expect(gameState?.host.hand.length).toBe(5);
      expect(gameState?.host.deck.length).toBe(5);
    });

    it('should not draw if not player turn', async () => {
      const hostDeck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Card ${i + 1}`,
        hp: 100,
        attack: 50,
        type: 'Electric',
        pokedexNumber: i + 1,
        imgUrl: null,
      }));

      const player2Deck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 11,
        name: `Card ${i + 11}`,
        hp: 100,
        attack: 50,
        type: 'Water',
        pokedexNumber: i + 11,
        imgUrl: null,
      }));

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Try to draw with player2 when it's host's turn
      await handleDrawCards(mockSocket2, mockIo);

      expect(mockSocket2.emit).toHaveBeenCalledWith('error', {
        message: 'Ce n\'est pas votre tour',
        code: 403,
      });
    });

    it('should not draw if hand is already full', async () => {
      const hostDeck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Card ${i + 1}`,
        hp: 100,
        attack: 50,
        type: 'Electric',
        pokedexNumber: i + 1,
        imgUrl: null,
      }));

      const player2Deck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 11,
        name: `Card ${i + 11}`,
        hp: 100,
        attack: 50,
        type: 'Water',
        pokedexNumber: i + 11,
        imgUrl: null,
      }));

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Fill hand to 5 cards
      const gameState = getGameState(1);
      if (gameState) {
        gameState.host.hand = hostDeck.slice(0, 5);
        gameState.host.deck = hostDeck.slice(5);
      }

      await handleDrawCards(mockSocket, mockIo);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Votre main est déjà pleine (5 cartes max)',
        code: 400,
      });
    });

    it('should not draw if not in a game', async () => {
      const socket = createMockSocket('socket_unknown', 3);
      await handleDrawCards(socket, mockIo);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
    });

    it('should not draw if deck is empty', async () => {
      const hostDeck: GameCard[] = [];
      const player2Deck: GameCard[] = [];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      await handleDrawCards(mockSocket, mockIo);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Plus de cartes dans le deck',
        code: 400,
      });
    });
  });

  describe('handlePlayCard', () => {
    it('should execute TRUE branch of turn check - not player turn', async () => {
      const hostDeck: GameCard[] = Array(5).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Card ${i + 1}`,
        hp: 100,
        attack: 50,
        type: 'Electric',
        pokedexNumber: i + 1,
        imgUrl: null,
      }));

      const player2Deck: GameCard[] = Array(5).fill(null).map((_, i) => ({
        id: i + 11,
        name: `Card ${i + 11}`,
        hp: 100,
        attack: 50,
        type: 'Water',
        pokedexNumber: i + 11,
        imgUrl: null,
      }));

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // TRUE branch: currentPlayerSocketId !== socket.id
      const payload: PlayCardPayload = { cardIndex: 0 };
      await handlePlayCard(mockSocket2, payload, mockIo);

      expect(mockSocket2.emit).toHaveBeenCalledWith('error', {
        message: 'Ce n\'est pas votre tour',
        code: 403,
      });
    });

    it('should execute FALSE branch of turn check - is player turn', async () => {
      const hostDeck: GameCard[] = Array(5).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Card ${i + 1}`,
        hp: 100,
        attack: 50,
        type: 'Electric',
        pokedexNumber: i + 1,
        imgUrl: null,
      }));

      const player2Deck: GameCard[] = Array(5).fill(null).map((_, i) => ({
        id: i + 11,
        name: `Card ${i + 11}`,
        hp: 100,
        attack: 50,
        type: 'Water',
        pokedexNumber: i + 11,
        imgUrl: null,
      }));

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // FALSE branch: currentPlayerSocketId === socket.id
      const gameState = getGameState(1);
      gameState!.host.hand = [...hostDeck];
      gameState!.host.deck = [];

      const payload: PlayCardPayload = { cardIndex: 0 };
      await handlePlayCard(mockSocket, payload, mockIo);

      // Verify success
      expect(gameState?.host.hand.length).toBe(4);
      expect(gameState?.host.activeCard).not.toBeNull();
    });

    it('should return error if game state not found (socket not in game)', async () => {
      const fakeSocket = createMockSocket('socket_fake_play', 3);
      
      await handlePlayCard(fakeSocket, { cardIndex: 0 }, mockIo);

      expect(fakeSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
    });

    it('should return error if room found but game state missing', async () => {
      const { __test__createOrphanedSocketMapping } = await import('../../src/socket/game');
      
      // Create orphaned mapping for playCard test
      __test__createOrphanedSocketMapping('socket_orphan_play', 9998);
      
      const orphanSocket = createMockSocket('socket_orphan_play', 3);
      await handlePlayCard(orphanSocket, { cardIndex: 0 }, mockIo);
      
      expect(orphanSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Partie non trouvée',
        code: 404,
      });
    });

    it('should play a card from hand to field when it is player turn', async () => {
      const hostDeck: GameCard[] = Array(5).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Card ${i + 1}`,
        hp: 100,
        attack: 50,
        type: 'Electric',
        pokedexNumber: i + 1,
        imgUrl: null,
      }));

      const player2Deck: GameCard[] = Array(5).fill(null).map((_, i) => ({
        id: i + 11,
        name: `Card ${i + 11}`,
        hp: 100,
        attack: 50,
        type: 'Water',
        pokedexNumber: i + 11,
        imgUrl: null,
      }));

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Verify it's host's turn
      const gameStateBefore = getGameState(1);
      expect(gameStateBefore?.currentPlayerSocketId).toBe('socket_host');

      // Add cards to hand
      const gameState = getGameState(1);
      if (gameState) {
        gameState.host.hand = [...hostDeck];
        gameState.host.deck = [];
      }

      const payload: PlayCardPayload = { cardIndex: 0 };
      await handlePlayCard(mockSocket, payload, mockIo);

      const updatedState = getGameState(1);
      expect(updatedState?.host.hand.length).toBe(4);
      expect(updatedState?.host.activeCard).not.toBeNull();
      expect(updatedState?.host.activeCard?.currentHp).toBe(100);
    });

    it('should not play card if not player turn', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      const payload: PlayCardPayload = { cardIndex: 0 };
      await handlePlayCard(mockSocket2, payload, mockIo);

      expect(mockSocket2.emit).toHaveBeenCalledWith('error', {
        message: 'Ce n\'est pas votre tour',
        code: 403,
      });
    });

    it('should not play card if invalid index', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      const payload: PlayCardPayload = { cardIndex: 5 };
      await handlePlayCard(mockSocket, payload, mockIo);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Index de carte invalide',
        code: 400,
      });
    });

    it('should not play card if field is occupied', async () => {
      const hostDeck: GameCard[] = [
        { id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null },
        { id: 2, name: 'Charmander', hp: 90, attack: 40, type: 'Fire', pokedexNumber: 4, imgUrl: null },
      ];
      const player2Deck: GameCard[] = [{ id: 3, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Set active card
      const gameState = getGameState(1);
      if (gameState) {
        gameState.host.hand = [...hostDeck];
        gameState.host.activeCard = { ...hostDeck[0], currentHp: 100 };
      }

      const payload: PlayCardPayload = { cardIndex: 1 };
      await handlePlayCard(mockSocket, payload, mockIo);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous avez déjà une carte active sur le terrain',
        code: 400,
      });
    });

    it('should not play card if not in a game', async () => {
      const socket = createMockSocket('socket_unknown', 3);
      const payload: PlayCardPayload = { cardIndex: 0 };
      await handlePlayCard(socket, payload, mockIo);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
    });
  });

  describe('handleAttack', () => {
    it('should execute TRUE branch of turn check - not player turn', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 100, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // TRUE branch: currentPlayerSocketId !== socket.id
      await handleAttack(mockSocket2, mockIo);

      expect(mockSocket2.emit).toHaveBeenCalledWith('error', {
        message: 'Ce n\'est pas votre tour',
        code: 403,
      });
    });

    it('should execute FALSE branch of turn check - is player turn', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 100, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // FALSE branch: currentPlayerSocketId === socket.id
      const gameState = getGameState(1);
      gameState!.host.activeCard = { ...hostDeck[0], currentHp: 100 };
      gameState!.player2.activeCard = { ...player2Deck[0], currentHp: 100 };

      await handleAttack(mockSocket, mockIo);

      // Verify success
      expect(gameState?.player2.activeCard?.currentHp).toBe(50);
    });

    it('should execute TRUE branch of score check - victory (score >= 3)', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 100, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 50, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      updateGameUserIds(1, 100, 200);

      // Set active cards and score to 2 (will become 3 after KO)
      const gameState = getGameState(1);
      gameState!.host.activeCard = { ...hostDeck[0], currentHp: 100 };
      gameState!.player2.activeCard = { ...player2Deck[0], currentHp: 50 };
      gameState!.host.score = 2; // Score will be exactly 3 after this attack

      // TRUE branch: score >= 3 after KO - triggers victory
      await handleAttack(mockSocket, mockIo);

      // Verify victory (game ended)
      expect(getGameState(1)).toBeUndefined();
      expect(mockIo.emit).toHaveBeenCalledWith('gameEnded', {
        winner: 100,
        reason: 'Victoire par host (3 points atteints)',
      });
    });

    it('should cover else branch line 378 - player2 wins with score >= 3', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 50, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 100, attack: 100, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      updateGameUserIds(1, 100, 200);

      // Set it to player2's turn
      const gameState = getGameState(1);
      gameState!.currentPlayerSocketId = 'socket_player2';
      gameState!.player2.activeCard = { ...player2Deck[0], currentHp: 100 };
      gameState!.host.activeCard = { ...hostDeck[0], currentHp: 50 };
      gameState!.player2.score = 2; // Score will be exactly 3 after this attack

      // Player2 attacks and wins - covers else branch at line 378 (winnerName = 'player2')
      await handleAttack(mockSocket2, mockIo);

      // Verify victory (game ended)
      expect(getGameState(1)).toBeUndefined();
      expect(mockIo.emit).toHaveBeenCalledWith('gameEnded', {
        winner: 200,
        reason: 'Victoire par player2 (3 points atteints)',
      });
    });

    it('should execute FALSE branch of score check - continue (score < 3)', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 100, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 50, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      updateGameUserIds(1, 100, 200);

      // Set active cards and score to 0 (will become 1 after KO)
      const gameState = getGameState(1);
      gameState!.host.activeCard = { ...hostDeck[0], currentHp: 100 };
      gameState!.player2.activeCard = { ...player2Deck[0], currentHp: 50 };
      gameState!.host.score = 0; // Score will be 1 after this attack

      // FALSE branch: score < 3 after KO - game continues
      await handleAttack(mockSocket, mockIo);

      // Verify game continues
      expect(gameState?.host.score).toBe(1);
      expect(gameState?.gameStatus).toBe('PLAYING');
      expect(gameState?.winner).toBeNull();
    });

    it('should return error if game state not found (socket not in game)', async () => {
      const fakeSocket = createMockSocket('socket_fake_attack', 3);
      
      await handleAttack(fakeSocket, mockIo);

      expect(fakeSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
    });

    it('should return error if room found but game state missing', async () => {
      const { __test__createOrphanedSocketMapping } = await import('../../src/socket/game');
      
      // Create orphaned mapping for attack test
      __test__createOrphanedSocketMapping('socket_orphan_attack', 9997);
      
      const orphanSocket = createMockSocket('socket_orphan_attack', 3);
      await handleAttack(orphanSocket, mockIo);
      
      expect(orphanSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Partie non trouvée',
        code: 404,
      });
    });

    it('should attack opponent and deal damage when it is player turn', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 100, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Verify it's host's turn
      const gameStateBefore = getGameState(1);
      expect(gameStateBefore?.currentPlayerSocketId).toBe('socket_host');

      // Set active cards
      const gameState = getGameState(1);
      if (gameState) {
        gameState.host.activeCard = { ...hostDeck[0], currentHp: 100 };
        gameState.player2.activeCard = { ...player2Deck[0], currentHp: 100 };
      }

      await handleAttack(mockSocket, mockIo);

      const updatedState = getGameState(1);
      expect(updatedState?.player2.activeCard?.currentHp).toBe(50); // 100 - 50 damage
      expect(updatedState?.currentPlayerSocketId).toBe('socket_player2'); // Turn changed
      expect(updatedState?.turnNumber).toBe(2);
    });

    it('should KO opponent card and increase score', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 100, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 50, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Set active cards with low HP for opponent
      const gameState = getGameState(1);
      if (gameState) {
        gameState.host.activeCard = { ...hostDeck[0], currentHp: 100 };
        gameState.player2.activeCard = { ...player2Deck[0], currentHp: 50 };
      }

      await handleAttack(mockSocket, mockIo);

      const updatedState = getGameState(1);
      expect(updatedState?.player2.activeCard).toBeNull(); // Card KO'd
      expect(updatedState?.host.score).toBe(1); // Score increased
    });

    it('should end game when score reaches exactly 3', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 100, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 50, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      updateGameUserIds(1, 100, 200);

      // Set active cards and score to 2 (will become 3 after KO)
      const gameState = getGameState(1);
      if (gameState) {
        gameState.host.activeCard = { ...hostDeck[0], currentHp: 100 };
        gameState.player2.activeCard = { ...player2Deck[0], currentHp: 50 };
        gameState.host.score = 2; // Score will be 3 after this attack
      }

      await handleAttack(mockSocket, mockIo);

      // Game should be ended and cleaned up
      expect(getGameState(1)).toBeUndefined();
      expect(mockIo.emit).toHaveBeenCalledWith('gameEnded', {
        winner: 100,
        reason: 'Victoire par host (3 points atteints)',
      });
    });

    it('should continue game when score is less than 3 after KO', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 100, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 50, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      updateGameUserIds(1, 100, 200);

      // Set active cards and score to 0 (will become 1 after KO, less than 3)
      const gameState = getGameState(1);
      if (gameState) {
        gameState.host.activeCard = { ...hostDeck[0], currentHp: 100 };
        gameState.player2.activeCard = { ...player2Deck[0], currentHp: 50 };
        gameState.host.score = 0; // Score will be 1 after this attack, game continues
      }

      await handleAttack(mockSocket, mockIo);

      // Game should continue (not ended)
      const updatedState = getGameState(1);
      expect(updatedState).toBeDefined();
      expect(updatedState?.host.score).toBe(1);
      expect(updatedState?.gameStatus).toBe('PLAYING');
      expect(updatedState?.winner).toBeNull();
    });

    it('should not attack if not player turn', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      await handleAttack(mockSocket2, mockIo);

      expect(mockSocket2.emit).toHaveBeenCalledWith('error', {
        message: 'Ce n\'est pas votre tour',
        code: 403,
      });
    });

    it('should not attack if no active card', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      await handleAttack(mockSocket, mockIo);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'avez pas de carte active',
        code: 400,
      });
    });

    it('should not attack if opponent has no active card', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Set only host active card
      const gameState = getGameState(1);
      if (gameState) {
        gameState.host.activeCard = { ...hostDeck[0], currentHp: 100 };
      }

      await handleAttack(mockSocket, mockIo);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'L\'adversaire n\'a pas de carte active',
        code: 400,
      });
    });

    it('should not attack if not in a game', async () => {
      const socket = createMockSocket('socket_unknown', 3);
      await handleAttack(socket, mockIo);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
    });
  });

  describe('handleEndTurn', () => {
    it('should execute TRUE branch of turn check - not player turn', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // TRUE branch: currentPlayerSocketId !== socket.id
      const payload: EndTurnPayload = { roomId: 1 };
      await handleEndTurn(mockSocket2, payload, mockIo);

      expect(mockSocket2.emit).toHaveBeenCalledWith('error', {
        message: 'Ce n\'est pas votre tour',
        code: 403,
      });
    });

    it('should execute FALSE branch of turn check - is player turn', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // FALSE branch: currentPlayerSocketId === socket.id
      const gameState = getGameState(1);
      const payload: EndTurnPayload = { roomId: 1 };
      await handleEndTurn(mockSocket, payload, mockIo);

      // Verify success
      expect(gameState?.currentPlayerSocketId).toBe('socket_player2');
      expect(gameState?.turnNumber).toBe(2);
    });

    it('should return error if game state not found (socket not in game)', async () => {
      const fakeSocket = createMockSocket('socket_fake_end', 3);
      
      await handleEndTurn(fakeSocket, { roomId: 1 }, mockIo);

      expect(fakeSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
    });

    it('should return error if room found but game state missing', async () => {
      const { __test__createOrphanedSocketMapping } = await import('../../src/socket/game');
      
      // Create orphaned mapping for endTurn test
      __test__createOrphanedSocketMapping('socket_orphan_endturn', 9996);
      
      const orphanSocket = createMockSocket('socket_orphan_endturn', 3);
      await handleEndTurn(orphanSocket, { roomId: 9996 }, mockIo);
      
      expect(orphanSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Partie non trouvée',
        code: 404,
      });
    });

    it('should end turn and switch to opponent', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      const payload: EndTurnPayload = { roomId: 1 };
      await handleEndTurn(mockSocket, payload, mockIo);

      const updatedState = getGameState(1);
      expect(updatedState?.currentPlayerSocketId).toBe('socket_player2');
      expect(updatedState?.turnNumber).toBe(2);
    });

    it('should not end turn if not player turn', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      const payload: EndTurnPayload = { roomId: 1 };
      await handleEndTurn(mockSocket2, payload, mockIo);

      expect(mockSocket2.emit).toHaveBeenCalledWith('error', {
        message: 'Ce n\'est pas votre tour',
        code: 403,
      });
    });

    it('should not end turn if room ID mismatch', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      const payload: EndTurnPayload = { roomId: 999 };
      await handleEndTurn(mockSocket, payload, mockIo);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Room ID invalide',
        code: 400,
      });
    });

    it('should not end turn if not in a game', async () => {
      const socket = createMockSocket('socket_unknown', 3);
      const payload: EndTurnPayload = { roomId: 1 };
      await handleEndTurn(socket, payload, mockIo);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
    });
  });

  describe('handlePlayerDisconnect', () => {
    it('should clean up socket mapping when game not found (orphaned mapping)', async () => {
      const { __test__createOrphanedSocketMapping, getRoomIdBySocket } = await import('../../src/socket/game');
      
      // Create orphaned mapping - socket mapped to room but game doesn't exist
      __test__createOrphanedSocketMapping('socket_orphan_disconnect', 8888);
      
      // Verify socket is mapped
      expect(getRoomIdBySocket('socket_orphan_disconnect')).toBe(8888);
      
      // Call disconnect - should clean up the orphaned mapping
      handlePlayerDisconnect('socket_orphan_disconnect', mockIo);
      
      // Should clean up the mapping even when game not found
      expect(getRoomIdBySocket('socket_orphan_disconnect')).toBeUndefined();
    });

    it('should clean up socket mapping when game exists but socket not found in game', () => {
      // Create a game and then simulate orphaned socket mapping
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(500, 'socket_orphan_host', 'socket_orphan_p2', hostDeck, player2Deck);
      
      // Verify socket is mapped
      expect(getRoomIdBySocket('socket_orphan_host')).toBe(500);
      
      // Call disconnect - should handle gracefully and clean up
      handlePlayerDisconnect('socket_orphan_host', mockIo);
      
      // Should clean up the mapping
      expect(getRoomIdBySocket('socket_orphan_host')).toBeUndefined();
    });

    it('should declare opponent winner on disconnect', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      updateGameUserIds(1, 100, 200);

      handlePlayerDisconnect('socket_host', mockIo);

      expect(mockIo.to).toHaveBeenCalledWith('socket_player2');
      expect(mockIo.emit).toHaveBeenCalledWith('gameEnded', {
        winner: 200,
        reason: 'Victoire par forfait (adversaire déconnecté)',
      });

      // Game should be cleaned up
      expect(getGameState(1)).toBeUndefined();
    });

    it('should handle player2 disconnect covering else branch line 467', () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      updateGameUserIds(1, 100, 200);

      // This test covers the else branch in handlePlayerDisconnect (line 467)
      // where isHost is FALSE (player2 disconnects), so opponent = gameState.host
      handlePlayerDisconnect('socket_player2', mockIo);

      // Verify host is declared winner (opponent when player2 disconnects)
      expect(mockIo.to).toHaveBeenCalledWith('socket_host');
      expect(mockIo.emit).toHaveBeenCalledWith('gameEnded', {
        winner: 100,
        reason: 'Victoire par forfait (adversaire déconnecté)',
      });

      // Game should be cleaned up
      expect(getGameState(1)).toBeUndefined();
    });

    it('should do nothing if socket not in a game', () => {
      handlePlayerDisconnect('unknown_socket', mockIo);
      expect(mockIo.to).not.toHaveBeenCalled();
    });

  });

  describe('__test__createOrphanedSocketMapping', () => {
    it('should create orphaned socket mapping for testing', async () => {
      const { __test__createOrphanedSocketMapping, getRoomIdBySocket } = await import('../../src/socket/game');
      
      const result = __test__createOrphanedSocketMapping('test_socket_orphan', 12345);
      
      expect(result).toBe(true);
      expect(getRoomIdBySocket('test_socket_orphan')).toBe(12345);
    });
  });

  describe('resetAllGames', () => {
    it('should clear all games and socket mappings', () => {
      // Create a game first
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(999, 'socket_host_reset', 'socket_p2_reset', hostDeck, player2Deck);
      
      // Verify game exists
      expect(getGameState(999)).toBeDefined();
      expect(getRoomIdBySocket('socket_host_reset')).toBe(999);
      
      // Reset all games
      resetAllGames();
      
      // Verify everything is cleared
      expect(getGameState(999)).toBeUndefined();
      expect(getRoomIdBySocket('socket_host_reset')).toBeUndefined();
      expect(getRoomIdBySocket('socket_p2_reset')).toBeUndefined();
    });
  });

  describe('registerGameHandlers', () => {
    it('should register all event handlers', () => {
      const mockServerSocket = {
        on: vi.fn(),
      };

      const mockIoWithOn = {
        on: vi.fn().mockImplementation((event, callback) => {
          if (event === 'connection') {
            callback(mockServerSocket);
          }
        }),
      } as unknown as Server;

      registerGameHandlers(mockIoWithOn);

      expect(mockIoWithOn.on).toHaveBeenCalledWith('connection', expect.any(Function));
      expect(mockServerSocket.on).toHaveBeenCalledWith('drawCards', expect.any(Function));
      expect(mockServerSocket.on).toHaveBeenCalledWith('playCard', expect.any(Function));
      expect(mockServerSocket.on).toHaveBeenCalledWith('attack', expect.any(Function));
      expect(mockServerSocket.on).toHaveBeenCalledWith('endTurn', expect.any(Function));
      expect(mockServerSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should call handlers when events are triggered', async () => {
      const handlers: Record<string, Function> = {};
      
      const mockServerSocket = {
        on: vi.fn().mockImplementation((event: string, callback: Function) => {
          handlers[event] = callback;
        }),
        id: 'test_socket_id',
        user: { userId: 1, email: 'test@example.com' },
        emit: vi.fn(),
      };

      const mockIoWithOn = {
        on: vi.fn().mockImplementation((event, callback) => {
          if (event === 'connection') {
            callback(mockServerSocket);
          }
        }),
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      } as unknown as Server;

      registerGameHandlers(mockIoWithOn);

      // Test that all handlers are registered
      expect(handlers['drawCards']).toBeDefined();
      expect(handlers['playCard']).toBeDefined();
      expect(handlers['attack']).toBeDefined();
      expect(handlers['endTurn']).toBeDefined();
      expect(handlers['disconnect']).toBeDefined();

      // Test that handlers can be called without throwing
      // They will emit errors because socket is not in a game, but shouldn't throw
      await handlers['drawCards']();
      expect(mockServerSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
      
      await handlers['playCard']({ cardIndex: 0 });
      expect(mockServerSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
      
      await handlers['attack']();
      expect(mockServerSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
      
      await handlers['endTurn']({ roomId: 1 });
      expect(mockServerSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Vous n\'êtes pas dans une partie',
        code: 400,
      });
      
      // Test disconnect handler - should not throw
      expect(() => handlers['disconnect']()).not.toThrow();
    });
  });

  // Branch coverage tests - explicitly test both branches of conditionals
  describe('Branch Coverage - handleDrawCards turn check line 280-285', () => {
    it('should cover TRUE branch: currentPlayerSocketId !== socket.id', async () => {
      const hostDeck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Card ${i + 1}`,
        hp: 100,
        attack: 50,
        type: 'Electric',
        pokedexNumber: i + 1,
        imgUrl: null,
      }));

      const player2Deck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 11,
        name: `Card ${i + 11}`,
        hp: 100,
        attack: 50,
        type: 'Water',
        pokedexNumber: i + 11,
        imgUrl: null,
      }));

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // TRUE branch: condition currentPlayerSocketId !== socket.id is TRUE
      // mockSocket2.id = 'socket_player2', currentPlayerSocketId = 'socket_host'
      // 'socket_host' !== 'socket_player2' = TRUE
      await handleDrawCards(mockSocket2, mockIo);

      expect(mockSocket2.emit).toHaveBeenCalledWith('error', {
        message: 'Ce n\'est pas votre tour',
        code: 403,
      });
    });

    it('should cover FALSE branch: currentPlayerSocketId === socket.id', async () => {
      const hostDeck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Card ${i + 1}`,
        hp: 100,
        attack: 50,
        type: 'Electric',
        pokedexNumber: i + 1,
        imgUrl: null,
      }));

      const player2Deck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 11,
        name: `Card ${i + 11}`,
        hp: 100,
        attack: 50,
        type: 'Water',
        pokedexNumber: i + 11,
        imgUrl: null,
      }));

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // FALSE branch: condition currentPlayerSocketId !== socket.id is FALSE
      // mockSocket.id = 'socket_host', currentPlayerSocketId = 'socket_host'
      // 'socket_host' !== 'socket_host' = FALSE
      const gameState = getGameState(1);
      await handleDrawCards(mockSocket, mockIo);

      expect(gameState?.host.hand.length).toBe(5);
    });
  });

  describe('Branch Coverage - handlePlayCard turn check line 323', () => {
    it('should cover TRUE branch: currentPlayerSocketId !== socket.id', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // TRUE branch: condition is TRUE (not player turn)
      const payload: PlayCardPayload = { cardIndex: 0 };
      await handlePlayCard(mockSocket2, payload, mockIo);

      expect(mockSocket2.emit).toHaveBeenCalledWith('error', {
        message: 'Ce n\'est pas votre tour',
        code: 403,
      });
    });

    it('should cover FALSE branch: currentPlayerSocketId === socket.id', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // FALSE branch: condition is FALSE (is player turn)
      const gameState = getGameState(1);
      gameState!.host.hand = [...hostDeck];

      const payload: PlayCardPayload = { cardIndex: 0 };
      await handlePlayCard(mockSocket, payload, mockIo);

      expect(gameState?.host.activeCard).not.toBeNull();
    });

    it('should cover TRUE branch of isHost ternary in handlePlayCard line 323', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // TRUE branch: isHost is TRUE (host is the current player)
      const gameState = getGameState(1);
      gameState!.host.hand = [...hostDeck];

      const payload: PlayCardPayload = { cardIndex: 0 };
      await handlePlayCard(mockSocket, payload, mockIo);

      // Verify host played card
      expect(gameState?.host.activeCard).not.toBeNull();
      expect(gameState?.player2.activeCard).toBeNull();
    });

    it('should cover FALSE branch of isHost ternary in handlePlayCard line 323 with player2 turn', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Set player2 as current player
      const gameState = getGameState(1);
      gameState!.currentPlayerSocketId = 'socket_player2';
      gameState!.player2.hand = [...player2Deck];

      // FALSE branch: isHost is FALSE (player2 is the current player)
      const payload: PlayCardPayload = { cardIndex: 0 };
      await handlePlayCard(mockSocket2, payload, mockIo);

      // Verify player2 played card (not host)
      expect(gameState?.player2.activeCard).not.toBeNull();
      expect(gameState?.host.activeCard).toBeNull();
    });
  });

  describe('Branch Coverage - handleAttack turn check line 384', () => {
    it('should cover TRUE branch: currentPlayerSocketId !== socket.id', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // TRUE branch: condition is TRUE (not player turn)
      await handleAttack(mockSocket2, mockIo);

      expect(mockSocket2.emit).toHaveBeenCalledWith('error', {
        message: 'Ce n\'est pas votre tour',
        code: 403,
      });
    });

    it('should cover FALSE branch: currentPlayerSocketId === socket.id', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // FALSE branch: condition is FALSE (is player turn)
      const gameState = getGameState(1);
      gameState!.host.activeCard = { ...hostDeck[0], currentHp: 100 };
      gameState!.player2.activeCard = { ...player2Deck[0], currentHp: 100 };

      await handleAttack(mockSocket, mockIo);

      expect(gameState?.player2.activeCard?.currentHp).toBe(50);
    });
  });

  describe('Branch Coverage - handleAttack score check line 411', () => {
    it('should cover TRUE branch: attacker.score >= 3', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 100, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 50, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      updateGameUserIds(1, 100, 200);

      const gameState = getGameState(1);
      gameState!.host.activeCard = { ...hostDeck[0], currentHp: 100 };
      gameState!.player2.activeCard = { ...player2Deck[0], currentHp: 50 };
      gameState!.host.score = 2; // Will become 3 after KO

      // TRUE branch: condition attacker.score >= 3 is TRUE after KO
      await handleAttack(mockSocket, mockIo);

      expect(getGameState(1)).toBeUndefined(); // Game ended
    });

    it('should cover FALSE branch: attacker.score < 3', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 100, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 50, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);
      updateGameUserIds(1, 100, 200);

      const gameState = getGameState(1);
      gameState!.host.activeCard = { ...hostDeck[0], currentHp: 100 };
      gameState!.player2.activeCard = { ...player2Deck[0], currentHp: 50 };
      gameState!.host.score = 0; // Will become 1 after KO

      // FALSE branch: condition attacker.score >= 3 is FALSE after KO
      await handleAttack(mockSocket, mockIo);

      expect(gameState?.host.score).toBe(1); // Game continues
      expect(gameState?.gameStatus).toBe('PLAYING');
    });
  });

  describe('Branch Coverage - handleEndTurn turn check', () => {
    it('should cover TRUE branch: currentPlayerSocketId !== socket.id', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // TRUE branch: condition is TRUE (not player turn)
      const payload: EndTurnPayload = { roomId: 1 };
      await handleEndTurn(mockSocket2, payload, mockIo);

      expect(mockSocket2.emit).toHaveBeenCalledWith('error', {
        message: 'Ce n\'est pas votre tour',
        code: 403,
      });
    });

    it('should cover FALSE branch: currentPlayerSocketId === socket.id', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // FALSE branch: condition is FALSE (is player turn)
      const gameState = getGameState(1);
      const payload: EndTurnPayload = { roomId: 1 };
      await handleEndTurn(mockSocket, payload, mockIo);

      expect(gameState?.currentPlayerSocketId).toBe('socket_player2');
    });

    it('should cover TRUE branch of isHost ternary in handleEndTurn line 411', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // TRUE branch: isHost is TRUE (host is the current player, so opponent is player2)
      const gameState = getGameState(1);
      const payload: EndTurnPayload = { roomId: 1 };
      await handleEndTurn(mockSocket, payload, mockIo);

      // Verify turn switched to player2 (opponent of host)
      expect(gameState?.currentPlayerSocketId).toBe('socket_player2');
    });

    it('should cover FALSE branch of isHost ternary in handleEndTurn line 411 with player2 turn', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Set player2 as current player
      const gameState = getGameState(1);
      gameState!.currentPlayerSocketId = 'socket_player2';

      // FALSE branch: isHost is FALSE (player2 is the current player, so opponent is host)
      const payload: EndTurnPayload = { roomId: 1 };
      await handleEndTurn(mockSocket2, payload, mockIo);

      // Verify turn switched to host (opponent of player2)
      expect(gameState?.currentPlayerSocketId).toBe('socket_host');
    });
  });

  // Branch coverage for ternary expressions (isHost ? host : player2)
  describe('Branch Coverage - Ternary isHost FALSE branch (player2 actions)', () => {
    it('should cover FALSE branch of isHost ternary in handleDrawCards line 284', async () => {
      const hostDeck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        name: `Card ${i + 1}`,
        hp: 100,
        attack: 50,
        type: 'Electric',
        pokedexNumber: i + 1,
        imgUrl: null,
      }));

      const player2Deck: GameCard[] = Array(10).fill(null).map((_, i) => ({
        id: i + 11,
        name: `Card ${i + 11}`,
        hp: 100,
        attack: 50,
        type: 'Water',
        pokedexNumber: i + 11,
        imgUrl: null,
      }));

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Set it to player2's turn
      const gameState = getGameState(1);
      gameState!.currentPlayerSocketId = 'socket_player2';

      // FALSE branch: isHost is FALSE (player2 is not host)
      await handleDrawCards(mockSocket2, mockIo);

      // Verify player2 drew cards (not host)
      expect(gameState?.player2.hand.length).toBe(5);
      expect(gameState?.host.hand.length).toBe(0);
    });

    it('should cover FALSE branch of isHost ternary in handlePlayCard line 323', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Set it to player2's turn and give player2 cards
      const gameState = getGameState(1);
      gameState!.currentPlayerSocketId = 'socket_player2';
      gameState!.player2.hand = [...player2Deck];

      // FALSE branch: isHost is FALSE (player2 is not host)
      const payload: PlayCardPayload = { cardIndex: 0 };
      await handlePlayCard(mockSocket2, payload, mockIo);

      // Verify player2 played card (not host)
      expect(gameState?.player2.activeCard).not.toBeNull();
      expect(gameState?.host.activeCard).toBeNull();
    });

    it('should cover FALSE branch of isHost ternary in handleAttack lines 384-385', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 100, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Set it to player2's turn and set active cards
      const gameState = getGameState(1);
      gameState!.currentPlayerSocketId = 'socket_player2';
      gameState!.player2.activeCard = { ...player2Deck[0], currentHp: 100 };
      gameState!.host.activeCard = { ...hostDeck[0], currentHp: 100 };

      // FALSE branch: isHost is FALSE (player2 is not host, so player2 is attacker)
      await handleAttack(mockSocket2, mockIo);

      // Verify player2 attacked host (host HP decreased)
      expect(gameState?.host.activeCard?.currentHp).toBe(50);
    });

    it('should cover FALSE branch of isHost ternary in handleEndTurn line 411', async () => {
      const hostDeck: GameCard[] = [{ id: 1, name: 'Pikachu', hp: 100, attack: 50, type: 'Electric', pokedexNumber: 25, imgUrl: null }];
      const player2Deck: GameCard[] = [{ id: 2, name: 'Squirtle', hp: 80, attack: 35, type: 'Water', pokedexNumber: 7, imgUrl: null }];

      initializeGame(1, 'socket_host', 'socket_player2', hostDeck, player2Deck);

      // Set it to player2's turn
      const gameState = getGameState(1);
      gameState!.currentPlayerSocketId = 'socket_player2';

      // FALSE branch: isHost is FALSE (player2 is not host, so opponent is host)
      const payload: EndTurnPayload = { roomId: 1 };
      await handleEndTurn(mockSocket2, payload, mockIo);

      // Verify turn switched to host (opponent of player2)
      expect(gameState?.currentPlayerSocketId).toBe('socket_host');
    });
  });
});
