import {Request, Response, Router} from 'express'
import {prisma} from "../database";
import {authenticateToken} from "../auth/middleware";
import { CardModel, DeckModel } from '../generated/prisma/models';

const router = Router()

// POST /api/decks
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    const name : string = req.body.name
    const cards : number[] = req.body.cards
    const userId = req.user?.userId

    if (!name || !cards || !Array.isArray(cards)) {
        return res.status(400).json({error: 'Name et cards (array) sont requis'})
    }

    if (cards.length !== 10) {
        return res.status(400).json({error: 'Un deck doit contenir exactement 10 cartes'})
    }

    try {
        const foundCards: CardModel[] = await prisma.card.findMany({
            where: {
                id: {in: cards},
            },
        })

        if (foundCards.length !== cards.length) {
            return res.status(400).json({error: 'Certaines cartes fournies n\'existent pas'})
        }

        const deck: DeckModel = await prisma.deck.create({
            data: {
                name,
                userId: userId!,
                cards: {
                    create: cards.map((cardId: number) => ({
                        cardId,
                    })),
                },
            },
            include: {
                cards: {
                    include: {
                        card: true,
                    },
                },
            },
        })

        return res.status(201).json(deck)
    } catch (error) {
        console.error('Erreur lors de la création du deck:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

export default router

