import {Request, Response, Router} from 'express'
import {prisma} from "../database";
import {authenticateToken} from "../auth/middleware";
import { CardModel, DeckModel } from '../generated/prisma/models';

const router = Router()

// PATCH /api/decks/:id
router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
    const deckId = parseInt(req.params.id)
    const userId = req.user?.userId
    const name : string = req.body.name
    const cards : number[] = req.body.cards

    if (isNaN(deckId)) {
        return res.status(400).json({error: 'ID de deck invalide'})
    }

    try {
        const existingDeck: DeckModel | null = await prisma.deck.findFirst({
            where: {
                id: deckId,
                userId: userId!,
            },
        })

        if (!existingDeck) {
            return res.status(404).json({error: 'Deck non trouvé'})
        }
        if (cards) {
            if (!Array.isArray(cards)) {
                return res.status(400).json({error: 'Cards doit être un array'})
            }

            if (cards.length !== 10) {
                return res.status(400).json({error: 'Un deck doit contenir exactement 10 cartes'})
            }

            const foundCards: CardModel[] = await prisma.card.findMany({
                where: {
                    id: {in: cards},
                },
            })

            if (foundCards.length !== cards.length) {
                return res.status(400).json({error: 'Certaines cartes fournies n\'existent pas'})
            }

            await prisma.deckCard.deleteMany({
                where: {
                    deckId: deckId,
                },
            })

            await prisma.deckCard.createMany({
                data: cards.map((cardId: number) => ({
                    deckId: deckId,
                    cardId: cardId,
                })),
            })
        }

        if (name) {
            await prisma.deck.update({
                where: {
                    id: deckId,
                },
                data: {
                    name,
                },
            })
        }

        // Fetch and return updated deck info
        const updatedDeck: DeckModel | null = await prisma.deck.findUnique({
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

        return res.status(200).json(updatedDeck)
    } catch (error) {
        console.error('Erreur lors de la mise à jour du deck:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

export default router

