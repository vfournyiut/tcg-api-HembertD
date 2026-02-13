import { vi, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { Express } from 'express'
import { env } from '../../src/env'
import { DeepMockProxy } from 'vitest-mock-extended'
import { PrismaClient } from '../../src/generated/prisma/client'

type CARD_TYPE =
  | 'Grass'
  | 'Fire'
  | 'Water'
  | 'Bug'
  | 'Flying'
  | 'Normal'
  | 'Poison'
  | 'Electric'
  | 'Psychic'
  | 'Ground'
  | 'Rock'
  | 'Fighting'
  | 'Ice'
  | 'Ghost'

// HELPERS JWT & AUTH

/** Génère un token JWT valide pour les tests */
export function createValidToken(
  userId: number = 1,
  email: string = 'test@example.com',
): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: '1h' })
}

/** Génère un token expiré pour les tests */
export function createExpiredToken(
  userId: number = 1,
  email: string = 'test@example.com',
): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: '-1s' })
}

// HELPERS MOCKS UTILISATEUR

interface MockUser {
  id: number
  email: string
  username: string
  password: string
  createdAt: Date
  updatedAt: Date
}

/** Crée un mock d'utilisateur standard */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// HELPERS MOCKS CARTES

interface MockCard {
  id: number
  name: string
  pokedexNumber: number
  type: CARD_TYPE
  hp: number
  attack: number
  imgUrl: string
  createdAt: Date
  updatedAt: Date
}

const CARD_DATA: Record<
  number,
  Omit<MockCard, 'id' | 'pokedexNumber' | 'imgUrl' | 'createdAt' | 'updatedAt'>
> = {
  1: { name: 'Bulbizarre', type: 'Grass', hp: 60, attack: 49 },
  2: { name: 'Salamèche', type: 'Fire', hp: 39, attack: 52 },
  3: { name: 'Carapuce', type: 'Water', hp: 44, attack: 48 },
  4: { name: 'Chenipan', type: 'Bug', hp: 30, attack: 35 },
  5: { name: 'Aspicot', type: 'Bug', hp: 40, attack: 35 },
  6: { name: 'Roucool', type: 'Flying', hp: 40, attack: 45 },
  7: { name: 'Rattata', type: 'Normal', hp: 30, attack: 56 },
  8: { name: 'Piafabec', type: 'Flying', hp: 40, attack: 60 },
  9: { name: 'Abo', type: 'Poison', hp: 35, attack: 60 },
  10: { name: 'Pikachu', type: 'Electric', hp: 35, attack: 55 },
}

/** Crée un mock de carte complet */
export function createMockCard(
  id: number,
  overrides: Partial<MockCard> = {},
): MockCard {
  const data = CARD_DATA[id] || {
    name: `Card${id}`,
    type: 'Normal',
    hp: 50,
    attack: 50,
  }
  return {
    id,
    name: data.name,
    pokedexNumber: id,
    type: data.type,
    hp: data.hp,
    attack: data.attack,
    imgUrl: `https://example.com/${id}.png`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as MockCard
}

/** Crée un tableau de 10 cartes valides pour les decks */
export function createValidDeckCards(): MockCard[] {
  return Array.from({ length: 10 }, (_, i) => createMockCard(i + 1))
}

/** Crée un mock de carte pour DeckCard (avec relation) */
export function createMockDeckCard(
  deckId: number,
  cardId: number,
  index: number,
): object {
  return {
    id: index,
    deckId,
    cardId,
    card: createMockCard(cardId),
  }
}

// HELPERS MOCKS DECK

interface MockDeck {
  id: number
  name: string
  userId: number
  createdAt: Date
  updatedAt: Date
  cards: object[]
}

/** Crée un mock de deck simple */
export function createMockDeck(
  userId: number = 1,
  overrides: Partial<MockDeck> = {},
): MockDeck {
  return {
    id: 1,
    name: 'Mon Deck',
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    cards: [],
    ...overrides,
  } as MockDeck
}

/** Crée un mock de deck complet avec cartes */
export function createMockDeckWithCards(userId: number = 1): MockDeck {
  const cards = createValidDeckCards()
  return {
    id: 1,
    name: 'Mon Deck',
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    cards: cards.map((card, index) =>
      createMockDeckCard(1, card.id, index + 1),
    ),
  } as MockDeck
}

// HELPERS ASSERTIONS

/** Assertion helper pour vérifier les réponses d'erreur */
export function expectError(
  response: any,
  expectedStatus: number,
  expectedMessage?: string,
): void {
  expect(response.status).toBe(expectedStatus)
  if (expectedMessage) {
    expect(response.body.error).toBe(expectedMessage)
  }
}

// HELPERS REQUÊTES

/** Effectue une requête sans token d'authentification */
export async function testWithoutAuth(
  app: Express,
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  body?: object,
): Promise<request.Response> {
  const req = request(app)[method](url)
  if (body) req.send(body)
  return await req
}

/** Effectue une requête avec token d'authentification */
export async function testWithAuth(
  app: Express,
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  token: string,
  body?: object,
): Promise<request.Response> {
  const req = request(app)[method](url).set('Authorization', `Bearer ${token}`)
  if (body) req.send(body)
  return await req
}

// HELPERS MOCK PRISMA

/** Configure le mock pour retourner null (élément non trouvé) */
export function mockNotFound(
  prismaMock: DeepMockProxy<PrismaClient>,
  method: keyof DeepMockProxy<PrismaClient>,
): void {
  ;(prismaMock[method] as any).mockResolvedValue(null)
}

/** Configure le mock pour retourner une erreur */
export function mockError(
  prismaMock: DeepMockProxy<PrismaClient>,
  method: keyof DeepMockProxy<PrismaClient>,
  errorMessage: string = 'Database error',
): void {
  ;(prismaMock[method] as any).mockRejectedValue(new Error(errorMessage))
}

/** Configure le mock pour retourner un tableau vide */
export function mockEmpty(
  prismaMock: DeepMockProxy<PrismaClient>,
  method: keyof DeepMockProxy<PrismaClient>,
): void {
  ;(prismaMock[method] as any).mockResolvedValue([])
}
