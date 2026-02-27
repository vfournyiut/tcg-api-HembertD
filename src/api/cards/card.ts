import { Request, Response, Router } from 'express'

import { prisma } from '../../database'
import { CardModel } from '../../generated/prisma/models'

export const cardRouter = Router()

/**
 * Route pour obtenir toutes les cartes
 * Retourne la liste de toutes les cartes Pokémon disponibles, triées par numéro de Pokédex
 * 
 * @route GET /
 * @description Retourne la liste de toutes les cartes Pokémon disponibles, triées par numéro de Pokédex
 * @returns {200} Tableau de CardModel trié par pokedexNumber ASC
 * @returns {500} Erreur lors de la récupération des cartes
 * @throws {500} Erreur lors de la récupération des cartes
 */
cardRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const cards: CardModel[] = await prisma.card.findMany({
      orderBy: {
        pokedexNumber: 'asc',
      },
    })
    return res.status(200).json(cards)
  } catch (error) {
    console.error('Erreur lors de la récupération des cartes:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})
