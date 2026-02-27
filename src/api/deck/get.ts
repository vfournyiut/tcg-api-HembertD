import { Request, Response, Router } from 'express'

import { prisma } from '../../database'
import { DeckModel } from '../../generated/prisma/models'
import { authenticateToken } from '../auth/middleware'

const router = Router()

/**
 * Route pour obtenir les decks de l'utilisateur connecté
 * Retourne tous les decks appartenant à l'utilisateur authentifié
 * 
 * @route GET /mine
 * @description Retourne tous les decks appartenant à l'utilisateur authentifié
 * @requires Token JWT d'authentification (via middleware authenticateToken)
 * @returns {200} Tableau de DeckModel avec leurs cartes
 * @returns {500} Erreur lors de la récupération des decks
 * @throws {500} Erreur lors de la récupération des decks
 */
router.get('/mine', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user?.userId

  try {
    const decks: DeckModel[] = await prisma.deck.findMany({
      where: {
        userId: userId!,
      },
      include: {
        cards: {
          include: {
            card: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return res.status(200).json(decks)
  } catch (error) {
    console.error('Erreur lors de la récupération des decks:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/**
 * Route pour obtenir un deck par ID
 * Retourne un deck spécifique par son ID, vérifiant que l'utilisateur en est propriétaire
 * 
 * @route GET /:id
 * @description Retourne un deck spécifique par son ID, vérifiant que l'utilisateur en est propriétaire
 * @param {number} req.params.id - ID du deck (requis)
 * @requires Token JWT d'authentification
 * @returns {200} Le DeckModel demandé
 * @returns {400} ID de deck invalide (NaN)
 * @returns {404} Deck non trouvé ou n'appartient pas à l'utilisateur
 * @returns {500} Erreur lors de la récupération du deck
 * @throws {400} ID de deck invalide (NaN)
 * @throws {404} Deck non trouvé
 * @throws {500} Erreur lors de la récupération du deck
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  const deckId: number = parseInt(req.params.id)
  const userId = req.user?.userId

  if (isNaN(deckId)) {
    return res.status(400).json({ error: 'ID de deck invalide' })
  }

  try {
    const deck: DeckModel | null = await prisma.deck.findUnique({
      where: {
        id: deckId,
        userId: userId,
      },
      include: {
        cards: {
          include: {
            card: true,
          },
        },
      },
    })

    if (!deck) {
      return res.status(404).json({ error: 'Deck non trouvé' })
    }

    return res.status(200).json(deck)
  } catch (error) {
    console.error('Erreur lors de la récupération du deck:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
