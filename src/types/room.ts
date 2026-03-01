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

/**
 * Carte active sur le terrain
 */
export interface ActiveCard extends GameCard {
  currentHp: number; // HP actuels (peut être différent des HP max)
}

/**
 * État complet du jeu (stocké côté serveur)
 */
export interface ServerGameState {
  roomId: number;
  host: {
    userId: number;
    socketId: string;
    hand: GameCard[];
    deck: GameCard[];
    activeCard: ActiveCard | null;
    score: number;
  };
  player2: {
    userId: number;
    socketId: string;
    hand: GameCard[];
    deck: GameCard[];
    activeCard: ActiveCard | null;
    score: number;
  };
  currentPlayerSocketId: string; // Socket ID du joueur dont c'est le tour
  turnNumber: number;
  gameStatus: 'PLAYING' | 'FINISHED';
  winner: number | null; // userId du gagnant
}

/**
 * État du jeu visible par un joueur spécifique (filtré)
 */
export interface ClientGameState {
  gameId: number;
  roomId: number;
  player: 'host' | 'player2';
  hand: GameCard[];
  handSize: number;
  deckSize: number;
  activeCard: ActiveCard | null;
  score: number;
  opponentHandSize: number;
  opponentDeckSize: number;
  opponentActiveCard: ActiveCard | null; // Carte adverse visible sur le terrain
  opponentScore: number;
  currentTurn: 'host' | 'player2';
  currentPlayerSocketId: string;
  isMyTurn: boolean;
  turnNumber: number;
  gameStatus: 'PLAYING' | 'FINISHED';
  winner: number | null;
}

/**
 * Payload pour l'événement playCard
 */
export interface PlayCardPayload {
  cardIndex: number; // Index de la carte dans la main (0-4)
}

/**
 * Payload pour l'événement endTurn
 */
export interface EndTurnPayload {
  roomId: number;
}
