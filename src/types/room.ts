/**
 * Types TypeScript pour les rooms de matchmaking
 */

/**
 * Représente une room d'attente pour un match
 */
export interface Room {
  id: number;
  name: string | null;
  hostId: number;
  hostUsername: string;
  hostDeckId: number;
  player2Id: number | null;
  player2Username: string | null;
  player2DeckId: number | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  createdAt: Date;
}

/**
 * Payload pour créer une room
 */
export interface CreateRoomPayload {
  deckId: number;
}

/**
 * Payload pour rejoindre une room
 */
export interface JoinRoomPayload {
  roomId: number;
  deckId: number;
}

/**
 * Réponse lors de la création d'une room
 */
export interface RoomCreatedResponse {
  room: Room;
}

/**
 * Réponse avec la liste des rooms
 */
export interface RoomsListResponse {
  rooms: Room[];
}

/**
 * Carte visible pour un joueur
 */
export interface GameCard {
  id: number;
  name: string;
  hp: number;
  attack: number;
  type: string;
  pokedexNumber: number;
  imgUrl: string | null;
}

/**
 * État du jeu pour un joueur spécifique
 */
export interface GameState {
  gameId: number;
  roomId: number;
  player: 'host' | 'player2';
  hand: GameCard[];
  handSize: number;
  deckSize: number;
  opponentHandSize: number;
  opponentDeckSize: number;
  currentTurn: 'host' | 'player2';
  turnNumber: number;
  gameStatus: 'PLAYING' | 'FINISHED';
  winner: number | null;
}

/**
 * Réponse lors du démarrage d'une partie
 */
export interface GameStartedResponse {
  gameState: GameState;
}

