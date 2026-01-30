import {Request, Response, Router} from 'express'
import {prisma} from "../database";
import {authenticateToken} from "../auth/middleware";
import { DeckModel } from '../generated/prisma/models';

const router = Router()

// GET /api/decks/mine
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
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

// GET /api/decks/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
    const deckId = parseInt(req.params.id)
    const userId = req.user?.userId

    if (isNaN(deckId)) {
        return res.status(400).json({error: 'ID de deck invalide'})
    }

    try {
        const deck: DeckModel | null = await prisma.deck.findUnique({
            where: {
                id: deckId,
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
            return res.status(404).json({error: 'Deck non trouvé'})
        }

        if (deck.userId !== userId) {
            return res.status(403).json({error: 'Accès interdit'})
        }

        return res.status(200).json(deck)
    } catch (error) {
        console.error('Erreur lors de la récupération du deck:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

export default router

