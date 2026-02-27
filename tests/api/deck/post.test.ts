import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { app } from '../../../src/index'
import { prismaMock } from '../../vitest.setup'
import {
  createValidToken,
  createValidDeckCards,
  createMockDeck,
  createMockDeckWithCards,
} from '../../utils/api'

describe('POST /api/decks', () => {
  const validToken = createValidToken(1, 'test@example.com')
  const validCards = createValidDeckCards()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TC-DECK-POST-001 : Sans token (401)', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/decks')
        .send({ name: 'Mon Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Token manquant')
    })
  })

  describe('TC-DECK-POST-002 : Name manquant (400)', () => {
    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/decks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Name et cards (array) sont requis')
    })
  })

  describe('TC-DECK-POST-003 : Cards manquant (400)', () => {
    it('should return 400 when cards is missing', async () => {
      const response = await request(app)
        .post('/api/decks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Mon Deck' })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Name et cards (array) sont requis')
    })
  })

  describe('TC-DECK-POST-004 : Cards nest pas un array (400)', () => {
    it('should return 400 when cards is not an array', async () => {
      const response = await request(app)
        .post('/api/decks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Mon Deck', cards: 'not-an-array' })

      expect(response.status).toBe(400)
    })
  })

  describe('TC-DECK-POST-005 : Moins de 10 cartes (400)', () => {
    it('should return 400 when cards has less than 10', async () => {
      const response = await request(app)
        .post('/api/decks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Mon Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9] })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe(
        'Un deck doit contenir exactement 10 cartes',
      )
    })
  })

  describe('TC-DECK-POST-006 : Plus de 10 cartes (400)', () => {
    it('should return 400 when cards has more than 10', async () => {
      const response = await request(app)
        .post('/api/decks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Mon Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe(
        'Un deck doit contenir exactement 10 cartes',
      )
    })
  })

  describe('TC-DECK-POST-007 : Cartes inexistantes (400)', () => {
    it('should return 400 when some cards do not exist', async () => {
      const mockCards = validCards.slice(0, 2)
      prismaMock.card.findMany.mockResolvedValue(mockCards)

      const response = await request(app)
        .post('/api/decks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Mon Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe(
        "Certaines cartes fournies n'existent pas",
      )
    })
  })

  describe('TC-DECK-POST-008 : Création réussie (201)', () => {
    it('should return 201 and created deck', async () => {
      prismaMock.card.findMany.mockResolvedValue(validCards)
      const mockDeck = createMockDeckWithCards(1)
      prismaMock.deck.create.mockResolvedValue(mockDeck)

      const response = await request(app)
        .post('/api/decks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Mon Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })

      expect(response.status).toBe(201)
      expect(response.body.id).toBe(1)
      expect(response.body.name).toBe('Mon Deck')
      expect(response.body.cards.length).toBe(10)
    })
  })

  describe('TC-DECK-POST-009 : Erreur serveur (500)', () => {
    it('should return 500 when database error occurs', async () => {
      prismaMock.card.findMany.mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/decks')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Mon Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Erreur serveur')
    })
  })
})
