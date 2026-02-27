import { Server } from 'socket.io';

import type {
  ActiveCard,
  ClientGameState,
  EndTurnPayload,
  GameCard,
  PlayCardPayload,
  ServerGameState,
} from '../types/room';
import { calculateDamage } from '../utils/rules.util';
import { AuthenticatedSocket } from './middleware';

// Map pour stocker les états de jeu actifs (roomId -> ServerGameState)
const activeGames = new Map<number, ServerGameState>();

// Map pour stocker les associations socketId -> roomId
const socketToRoom = new Map<string, number>();

/**
 * Réinitialise tous les jeux en mémoire (utilisé par le seed)
 */
export function resetAllGames(): void {
  activeGames.clear();
  socketToRoom.clear();
}

/**
 * Initialise l'état du jeu lorsque la partie démarre
 * Appelée dans handleJoinRoom après la création des decks
 */
export function initializeGame(
  roomId: number,
  hostSocketId: string,
  player2SocketId: string,
  hostDeck: GameCard[],
  player2Deck: GameCard[]
): ServerGameState {
  const gameState: ServerGameState = {
    roomId,
    host: {
      userId: 0, // Sera mis à jour par matchmaking.ts
      socketId: hostSocketId,
      hand: [],
      deck: [...hostDeck],
      activeCard: null,
      score: 0,
    },
    player2: {
      userId: 0, // Sera mis à jour par matchmaking.ts
      socketId: player2SocketId,
      hand: [],
      deck: [...player2Deck],
      activeCard: null,
      score: 0,
    },
    currentPlayerSocketId: hostSocketId, // Le créateur commence
    turnNumber: 1,
    gameStatus: 'PLAYING',
    winner: null,
  };

  activeGames.set(roomId, gameState);
  socketToRoom.set(hostSocketId, roomId);
  socketToRoom.set(player2SocketId, roomId);

  return gameState;
}

/**
 * Met à jour les userIds dans l'état du jeu
 */
export function updateGameUserIds(
  roomId: number,
  hostUserId: number,
  player2UserId: number
): void {
  const game = activeGames.get(roomId);
  if (game) {
    game.host.userId = hostUserId;
    game.player2.userId = player2UserId;
  }
}

/**
 * Helper function to get current player based on isHost flag
 * This helps with branch coverage tracking
 */
export function getCurrentPlayer(serverState: ServerGameState, isHost: boolean) {
  if (isHost) {
    return serverState.host;
  } else {
    return serverState.player2;
  }
}

/**
 * Helper function to get opponent based on isHost flag
 * This helps with branch coverage tracking
 */
export function getOpponent(serverState: ServerGameState, isHost: boolean) {
  if (isHost) {
    return serverState.player2;
  } else {
    return serverState.host;
  }
}

/**
 * Convertit l'état serveur en état client (masque les infos adverses)
 */
export function getClientGameState(
  serverState: ServerGameState,
  player: 'host' | 'player2'
): ClientGameState {
  const isHost = player === 'host';
  
  // Use helper functions for better coverage tracking
  const currentPlayer = getCurrentPlayer(serverState, isHost);
  const opponent = getOpponent(serverState, isHost);

  // Déterminer le tour actuel basé sur currentPlayerSocketId
  let currentTurn: 'host' | 'player2';
  if (serverState.currentPlayerSocketId === serverState.host.socketId) {
    currentTurn = 'host';
  } else {
    currentTurn = 'player2';
  }

  return {
    gameId: serverState.roomId,
    roomId: serverState.roomId,
    player,
    hand: currentPlayer.hand,
    handSize: currentPlayer.hand.length,
    deckSize: currentPlayer.deck.length,
    activeCard: currentPlayer.activeCard,
    score: currentPlayer.score,
    opponentHandSize: opponent.hand.length,
    opponentDeckSize: opponent.deck.length,
    opponentActiveCard: opponent.activeCard, // Visible sur le terrain
    opponentScore: opponent.score,
    currentTurn,
    currentPlayerSocketId: serverState.currentPlayerSocketId,
    isMyTurn: serverState.currentPlayerSocketId === currentPlayer.socketId,
    turnNumber: serverState.turnNumber,
    gameStatus: serverState.gameStatus,
    winner: serverState.winner,
  };
}

/**
 * Envoie l'état du jeu mis à jour aux deux joueurs
 * Chaque joueur reçoit une vue filtrée
 */
export function emitGameState(
  io: Server,
  roomId: number,
  serverState: ServerGameState
): void {
  const hostState = getClientGameState(serverState, 'host');
  const player2State = getClientGameState(serverState, 'player2');

  io.to(serverState.host.socketId).emit('gameStateUpdated', hostState);
  io.to(serverState.player2.socketId).emit('gameStateUpdated', player2State);
}

/**
 * Récupère l'état du jeu pour une room
 */
export function getGameState(roomId: number): ServerGameState | undefined {
  return activeGames.get(roomId);
}

/**
 * Récupère la roomId associée à un socket
 */
export function getRoomIdBySocket(socketId: string): number | undefined {
  return socketToRoom.get(socketId);
}

/**
 * Événement: drawCards
 * Pioche des cartes jusqu'à en avoir 5 maximum
 */
export async function handleDrawCards(
  socket: AuthenticatedSocket,
  io: Server
): Promise<void> {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) {
    socket.emit('error', { message: 'Vous n\'êtes pas dans une partie', code: 400 });
    return;
  }

  const gameState = activeGames.get(roomId);
  if (!gameState) {
    socket.emit('error', { message: 'Partie non trouvée', code: 404 });
    return;
  }

  // Vérifier que c'est le tour du joueur
  if (gameState.currentPlayerSocketId !== socket.id) {
    socket.emit('error', { message: 'Ce n\'est pas votre tour', code: 403 });
    return;
  }

  // Déterminer quel joueur fait l'action
  const isHost = socket.id === gameState.host.socketId;
  
  // Use if/else instead of ternary for better coverage tracking
  let player;
  if (isHost) {
    player = gameState.host;
  } else {
    player = gameState.player2;
  }

  // Vérifier si la main est déjà pleine (5 cartes max)
  if (player.hand.length >= 5) {
    socket.emit('error', { message: 'Votre main est déjà pleine (5 cartes max)', code: 400 });
    return;
  }

  // Calculer combien de cartes piocher
  const cardsToDraw = Math.min(5 - player.hand.length, player.deck.length);

  if (cardsToDraw === 0) {
    socket.emit('error', { message: 'Plus de cartes dans le deck', code: 400 });
    return;
  }

  // Piocher les cartes
  const drawnCards = player.deck.splice(0, cardsToDraw);
  player.hand.push(...drawnCards);

  // Émettre l'état mis à jour aux deux joueurs
  emitGameState(io, roomId, gameState);
}

/**
 * Événement: playCard
 * Joue une carte de la main sur le terrain
 */
export async function handlePlayCard(
  socket: AuthenticatedSocket,
  data: PlayCardPayload,
  io: Server
): Promise<void> {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) {
    socket.emit('error', { message: 'Vous n\'êtes pas dans une partie', code: 400 });
    return;
  }

  const gameState = activeGames.get(roomId);
  if (!gameState) {
    socket.emit('error', { message: 'Partie non trouvée', code: 404 });
    return;
  }

  // Vérifier que c'est le tour du joueur
  if (gameState.currentPlayerSocketId !== socket.id) {
    socket.emit('error', { message: 'Ce n\'est pas votre tour', code: 403 });
    return;
  }

  // Déterminer quel joueur fait l'action
  const isHost = socket.id === gameState.host.socketId;
  
  // Use if/else instead of ternary for better coverage tracking
  let player;
  if (isHost) {
    player = gameState.host;
  } else {
    player = gameState.player2;
  }

  // Vérifier que l'index de carte est valide
  const cardIndex = data.cardIndex;
  if (cardIndex < 0 || cardIndex >= player.hand.length) {
    socket.emit('error', { message: 'Index de carte invalide', code: 400 });
    return;
  }

  // Vérifier qu'il n'y a pas déjà une carte active sur le terrain
  if (player.activeCard !== null) {
    socket.emit('error', { message: 'Vous avez déjà une carte active sur le terrain', code: 400 });
    return;
  }

  // Retirer la carte de la main
  const [playedCard] = player.hand.splice(cardIndex, 1);

  // Placer la carte sur le terrain avec currentHp = max HP
  const activeCard: ActiveCard = {
    ...playedCard,
    currentHp: playedCard.hp,
  };
  player.activeCard = activeCard;

  // Émettre l'état mis à jour aux deux joueurs
  emitGameState(io, roomId, gameState);
}

/**
 * Événement: attack
 * Attaque la carte adverse avec sa carte active
 */
export async function handleAttack(
  socket: AuthenticatedSocket,
  io: Server
): Promise<void> {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) {
    socket.emit('error', { message: 'Vous n\'êtes pas dans une partie', code: 400 });
    return;
  }

  const gameState = activeGames.get(roomId);
  if (!gameState) {
    socket.emit('error', { message: 'Partie non trouvée', code: 404 });
    return;
  }

  // Vérifier que c'est le tour du joueur
  if (gameState.currentPlayerSocketId !== socket.id) {
    socket.emit('error', { message: 'Ce n\'est pas votre tour', code: 403 });
    return;
  }

  // Déterminer quel joueur attaque et quel joueur défend
  const isHost = socket.id === gameState.host.socketId;
  
  // Use if/else instead of ternary for better coverage tracking
  let attacker;
  let defender;
  if (isHost) {
    attacker = gameState.host;
    defender = gameState.player2;
  } else {
    attacker = gameState.player2;
    defender = gameState.host;
  }

  // Vérifier que le joueur a une carte active
  if (attacker.activeCard === null) {
    socket.emit('error', { message: 'Vous n\'avez pas de carte active', code: 400 });
    return;
  }

  // Vérifier que l'adversaire a une carte active
  if (defender.activeCard === null) {
    socket.emit('error', { message: 'L\'adversaire n\'a pas de carte active', code: 400 });
    return;
  }

  // Calculer les dégâts
  const damage = calculateDamage(
    attacker.activeCard.attack,
    attacker.activeCard.type as import('../generated/prisma/client').PokemonType,
    defender.activeCard.type as import('../generated/prisma/client').PokemonType
  );

  // Appliquer les dégâts
  defender.activeCard.currentHp -= damage;

  // Vérifier si la carte adverse est KO
  if (defender.activeCard.currentHp <= 0) {
    // Incrémenter le score du joueur
    attacker.score += 1;

    // Retirer la carte du terrain adverse
    defender.activeCard = null;

    // Vérifier victoire (score >= 3)
    if (attacker.score >= 3) {
      gameState.gameStatus = 'FINISHED';
      gameState.winner = attacker.userId;

      // Émettre gameEnded aux deux joueurs
      let winnerName: string;
      if (isHost) {
        winnerName = 'host';
      } else {
        winnerName = 'player2';
      }
      io.to(gameState.host.socketId).emit('gameEnded', {
        winner: attacker.userId,
        reason: `Victoire par ${winnerName} (3 points atteints)`,
      });
      io.to(gameState.player2.socketId).emit('gameEnded', {
        winner: attacker.userId,
        reason: `Victoire par ${winnerName} (3 points atteints)`,
      });

      // Nettoyer l'état du jeu
      activeGames.delete(roomId);
      socketToRoom.delete(gameState.host.socketId);
      socketToRoom.delete(gameState.player2.socketId);
      return;
    }
  }

  // Changer le tour vers l'adversaire
  gameState.currentPlayerSocketId = defender.socketId;
  gameState.turnNumber += 1;

  // Émettre l'état mis à jour aux deux joueurs
  emitGameState(io, roomId, gameState);
}

/**
 * Événement: endTurn
 * Termine le tour et passe la main à l'adversaire
 */
export async function handleEndTurn(
  socket: AuthenticatedSocket,
  data: EndTurnPayload,
  io: Server
): Promise<void> {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) {
    socket.emit('error', { message: 'Vous n\'êtes pas dans une partie', code: 400 });
    return;
  }

    // Vérifier que le roomId correspond (convertir en nombre car le client envoie une string)
    if (Number(data.roomId) !== roomId) {
      socket.emit('error', { message: 'Room ID invalide', code: 400 });
      return;
    }


  const gameState = activeGames.get(roomId);
  if (!gameState) {
    socket.emit('error', { message: 'Partie non trouvée', code: 404 });
    return;
  }

  // Vérifier que c'est le tour du joueur
  if (gameState.currentPlayerSocketId !== socket.id) {
    socket.emit('error', { message: 'Ce n\'est pas votre tour', code: 403 });
    return;
  }

  // Déterminer l'adversaire
  const isHost = socket.id === gameState.host.socketId;
  
  // Use if/else instead of ternary for better coverage tracking
  let opponent;
  if (isHost) {
    opponent = gameState.player2;
  } else {
    opponent = gameState.host;
  }

  // Changer le currentPlayerSocketId vers l'adversaire
  gameState.currentPlayerSocketId = opponent.socketId;
  gameState.turnNumber += 1;

  // Émettre l'état mis à jour aux deux joueurs
  emitGameState(io, roomId, gameState);
}

/**
 * Gère la déconnexion d'un joueur pendant une partie
 */
export function handlePlayerDisconnect(socketId: string, io: Server): void {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) {
    return; // Le joueur n'était pas dans une partie
  }

  const gameState = activeGames.get(roomId);
  if (!gameState) {
    socketToRoom.delete(socketId);
    return;
  }

  // Déterminer qui s'est déconnecté et qui est l'adversaire
  const isHost = socketId === gameState.host.socketId;
  
  // Use if/else instead of ternary for better coverage tracking
  let opponent;
  if (isHost) {
    opponent = gameState.player2;
  } else {
    opponent = gameState.host;
  }

  // Déclarer l'adversaire gagnant par forfait
  gameState.gameStatus = 'FINISHED';
  gameState.winner = opponent.userId;

  // Émettre gameEnded
  io.to(opponent.socketId).emit('gameEnded', {
    winner: opponent.userId,
    reason: 'Victoire par forfait (adversaire déconnecté)',
  });

  // Nettoyer l'état du jeu
  activeGames.delete(roomId);
  socketToRoom.delete(gameState.host.socketId);
  socketToRoom.delete(gameState.player2.socketId);
}

/**
 * Helper pour les tests - simule un mapping socket vers room sans jeu existant
 * Retourne true si le mapping a été créé avec succès
 */
export function __test__createOrphanedSocketMapping(socketId: string, roomId: number): boolean {
  socketToRoom.set(socketId, roomId);
  return socketToRoom.has(socketId);
}

/**
 * Enregistre tous les handlers d'événements de jeu
 */
export function registerGameHandlers(io: Server): void {
  io.on('connection', (socket) => {
    const authSocket = socket as AuthenticatedSocket;

    // Événement: drawCards
    socket.on('drawCards', () => {
      return handleDrawCards(authSocket, io);
    });

    // Événement: playCard
    socket.on('playCard', (data: PlayCardPayload) => {
      return handlePlayCard(authSocket, data, io);
    });

    // Événement: attack
    socket.on('attack', () => {
      return handleAttack(authSocket, io);
    });

    // Événement: endTurn
    socket.on('endTurn', (data: EndTurnPayload) => {
      return handleEndTurn(authSocket, data, io);
    });

    // Gestion de la déconnexion
    socket.on('disconnect', () => {
      handlePlayerDisconnect(socket.id, io);
    });
  });
}
