import { Server, Socket } from 'socket.io';

import { prisma } from '../database';
import type { CreateRoomPayload, GameCard,GameState, JoinRoomPayload, Room } from '../types/room';
import { AuthenticatedSocket } from './middleware';

interface RoomWithHost extends Room {
  hostUsername: string;
}

export async function validateDeck(deckId: number, userId: number): Promise<{ valid: boolean; deck?: { id: number; cards: { cardId: number }[] }; error?: string }> {
  if (!deckId || isNaN(deckId)) {
    return { valid: false, error: 'deckId manquant ou invalide' };
  }

  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: { cards: true },
  });

  if (!deck) {
    return { valid: false, error: 'Deck non trouvé' };
  }

  if (deck.userId !== userId) {
    return { valid: false, error: 'Le deck ne vous appartient pas' };
  }

  if (deck.cards.length !== 10) {
    return { valid: false, error: 'Le deck doit contenir exactement 10 cartes' };
  }

  return { valid: true, deck: { id: deck.id, cards: deck.cards.map(c => ({ cardId: c.cardId })) } };
}

async function getWaitingRooms(): Promise<RoomWithHost[]> {
  const rooms = await prisma.room.findMany({
    where: { status: 'WAITING' },
    orderBy: { createdAt: 'desc' },
  });

  const roomsWithHost = await Promise.all(
    rooms.map(async (room) => {
      const host = await prisma.user.findUnique({
        where: { id: room.hostId },
        select: { username: true },
      });
      return {
        id: room.id,
        name: room.name,
        hostId: room.hostId,
        hostUsername: host?.username || 'Unknown',
        hostDeckId: room.hostDeckId,
        player2Id: room.player2Id,
        player2Username: null,
        player2DeckId: room.player2DeckId,
        status: room.status as 'WAITING' | 'IN_PROGRESS' | 'FINISHED',
        createdAt: room.createdAt,
      };
    })
  );

  return roomsWithHost;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function createGameState(
  roomId: number,
  hostDeckId: number,
  player2DeckId: number
): Promise<{ hostGameState: GameState; player2GameState: GameState }> {
  const hostDeck = await prisma.deck.findUnique({
    where: { id: hostDeckId },
    include: { cards: { include: { card: true } } },
  });

  const player2Deck = await prisma.deck.findUnique({
    where: { id: player2DeckId },
    include: { cards: { include: { card: true } } },
  });

  if (!hostDeck || !player2Deck) {
    throw new Error('Deck non trouvé');
  }

  const hostCards: GameCard[] = hostDeck.cards.map((dc) => ({
    id: dc.card.id,
    name: dc.card.name,
    hp: dc.card.hp,
    attack: dc.card.attack,
    type: dc.card.type,
    pokedexNumber: dc.card.pokedexNumber,
    imgUrl: dc.card.imgUrl,
  }));

  const player2Cards: GameCard[] = player2Deck.cards.map((dc) => ({
    id: dc.card.id,
    name: dc.card.name,
    hp: dc.card.hp,
    attack: dc.card.attack,
    type: dc.card.type,
    pokedexNumber: dc.card.pokedexNumber,
    imgUrl: dc.card.imgUrl,
  }));

  const shuffledHostCards = shuffleArray(hostCards);
  const shuffledPlayer2Cards = shuffleArray(player2Cards);

  const initialHandSize = 0;
  const initialDeckSize = 10;

  const hostGameState: GameState = {
    gameId: roomId,
    roomId,
    player: 'host',
    hand: shuffledHostCards.slice(0, initialHandSize),
    handSize: initialHandSize,
    deckSize: initialDeckSize,
    opponentHandSize: initialHandSize,
    opponentDeckSize: initialDeckSize,
    currentTurn: 'host',
    turnNumber: 1,
    gameStatus: 'PLAYING',
    winner: null,
  };

  const player2GameState: GameState = {
    gameId: roomId,
    roomId,
    player: 'player2',
    hand: shuffledPlayer2Cards.slice(0, initialHandSize),
    handSize: initialHandSize,
    deckSize: initialDeckSize,
    opponentHandSize: initialHandSize,
    opponentDeckSize: initialDeckSize,
    currentTurn: 'host',
    turnNumber: 1,
    gameStatus: 'PLAYING',
    winner: null,
  };

  return { hostGameState, player2GameState };
}

async function handleCreateRoom(socket: AuthenticatedSocket, data: CreateRoomPayload, io: Server): Promise<void> {
  const userId = socket.user?.userId;
  const userEmail = socket.user?.email ?? 'Unknown';
  const deckId = Number(data.deckId);

  if (userId === undefined) {
    socket.emit('error', { message: 'Utilisateur non authentifié', code: 401 });
    return;
  }

  if (!deckId || isNaN(deckId)) {
    socket.emit('error', { message: 'deckId manquant ou invalide', code: 400 });
    return;
  }

  const deckValidation = await validateDeck(deckId, userId);
  if (!deckValidation.valid) {
    socket.emit('error', { message: deckValidation.error, code: deckValidation.error?.includes('appartient') ? 403 : 400 });
    return;
  }

  try {
    const room = await prisma.room.create({
      data: {
        name: `Room de ${userEmail}`,
        hostId: userId,
        hostDeckId: deckId,
        status: 'WAITING',
      },
    });

    socket.join(`room:${room.id}`);

    const host = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    const roomResponse: Room = {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      hostUsername: host?.username || userEmail,
      hostDeckId: room.hostDeckId,
      player2Id: room.player2Id,
      player2Username: null,
      player2DeckId: room.player2DeckId,
      status: room.status as 'WAITING' | 'IN_PROGRESS' | 'FINISHED',
      createdAt: room.createdAt,
    };

    socket.emit('roomCreated', { room: roomResponse });

    const waitingRooms = await getWaitingRooms();
    io.emit('roomsListUpdated', { rooms: waitingRooms });

    console.log(`Room ${room.id} créée par ${userEmail}`);
  } catch (error) {
    console.error('Erreur lors de la création de la room:', error);
    socket.emit('error', { message: 'Erreur lors de la création de la room', code: 500 });
  }
}

async function handleGetRooms(_socket: AuthenticatedSocket, io: Server): Promise<void> {
  try {
    const waitingRooms = await getWaitingRooms();
    io.emit('roomsList', { rooms: waitingRooms });
  } catch (error) {
    console.error('Erreur lors de la récupération des rooms:', error);
  }
}

async function handleJoinRoom(socket: AuthenticatedSocket, data: JoinRoomPayload, io: Server): Promise<void> {
  const userId = socket.user?.userId;
  const roomId = Number(data.roomId);
  const deckId = Number(data.deckId);

  if (userId === undefined) {
    socket.emit('error', { message: 'Utilisateur non authentifié', code: 401 });
    return;
  }

  if (!roomId || isNaN(roomId)) {
    socket.emit('error', { message: 'roomId manquant ou invalide', code: 400 });
    return;
  }
  if (!deckId || isNaN(deckId)) {
    socket.emit('error', { message: 'deckId manquant ou invalide', code: 400 });
    return;
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    socket.emit('error', { message: 'Room non trouvée', code: 404 });
    return;
  }

  if (room.status !== 'WAITING') {
    socket.emit('error', { message: 'La room est déjà complète', code: 400 });
    return;
  }

  if (room.hostId === userId) {
    socket.emit('error', { message: 'Vous êtes déjà dans cette room', code: 400 });
    return;
  }

  const deckValidation = await validateDeck(deckId, userId);
  if (!deckValidation.valid) {
    socket.emit('error', { message: deckValidation.error, code: deckValidation.error?.includes('appartient') ? 403 : 400 });
    return;
  }

  try {
    await prisma.room.update({
      where: { id: roomId },
      data: {
        player2Id: userId,
        player2DeckId: deckId,
        status: 'IN_PROGRESS',
      },
    });

    socket.join(`room:${roomId}`);

    const { hostGameState, player2GameState } = await createGameState(
      roomId,
      room.hostDeckId,
      deckId
    );

    io.to(`room:${roomId}`).emit('gameStarted', {
      host: hostGameState,
      player2: player2GameState,
    });

    const waitingRooms = await getWaitingRooms();
    io.emit('roomsListUpdated', { rooms: waitingRooms });

    console.log(`Partie démarrée dans la room ${roomId} entre host ${room.hostId} et player2 ${userId}`);
  } catch (error) {
    console.error('Erreur lors de la rejoint de la room:', error);
    socket.emit('error', { message: 'Erreur lors de la rejoint de la room', code: 500 });
  }
}

export function registerMatchmakingHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connecté: ${socket.id}, User: ${(socket as AuthenticatedSocket).user?.email}`);

    socket.on('createRoom', (data: CreateRoomPayload) => {
      return handleCreateRoom(socket as AuthenticatedSocket, data, io);
    });

    socket.on('getRooms', () => {
      return handleGetRooms(socket as AuthenticatedSocket, io);
    });

    socket.on('joinRoom', (data: JoinRoomPayload) => {
      return handleJoinRoom(socket as AuthenticatedSocket, data, io);
    });

    socket.on('leaveRoom', (data: { roomId: number }) => {
      const { roomId } = data;
      if (roomId) {
        socket.leave(`room:${roomId}`);
      }
    });
  });
}
