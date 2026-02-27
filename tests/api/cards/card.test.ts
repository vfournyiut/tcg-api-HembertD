import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { app } from '../../../src/index'
import { prismaMock } from '../../vitest.setup'
import { createMockCard } from '../../utils/api'

describe('GET /api/cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TC-CARD-001 : Récupération des cartes (200)', () => {
    it('should return 200 and all cards', async () => {
      const mockCards = [createMockCard(1), createMockCard(2)]
      prismaMock.card.findMany.mockResolvedValue(mockCards)

      const response = await request(app).get('/api/cards')

      expect(response.status).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].id).toBe(1)
      expect(response.body[0].name).toBe('Bulbizarre')
      expect(response.body[1].id).toBe(2)
      expect(response.body[1].name).toBe('Salamèche')
    })

    it('should return cards sorted by pokedexNumber ascending', async () => {
      const mockCardsInWrongOrder = [
        createMockCard(4),
        createMockCard(1),
        createMockCard(7),
      ]
      prismaMock.card.findMany.mockResolvedValue(mockCardsInWrongOrder)

      const response = await request(app).get('/api/cards')

      expect(response.status).toBe(200)
      expect(response.body.length).toBe(3)
      const pokedexNumbers = response.body.map((c: any) => c.pokedexNumber)
      expect(pokedexNumbers).toContain(1)
      expect(pokedexNumbers).toContain(4)
      expect(pokedexNumbers).toContain(7)
    })

    it('should return empty array when no cards exist', async () => {
      prismaMock.card.findMany.mockResolvedValue([])

      const response = await request(app).get('/api/cards')

      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
      expect(response.body.length).toBe(0)
    })
  })

  describe('TC-CARD-002 : Erreur serveur (500)', () => {
    it('should return 500 when database error occurs', async () => {
      prismaMock.card.findMany.mockRejectedValue(
        new Error('Database connection failed'),
      )

      const response = await request(app).get('/api/cards')

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Erreur serveur')
    })
  })
})
