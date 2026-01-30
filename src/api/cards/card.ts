import {Request, Response, Router} from 'express'
import {prisma} from "../../database";
import { CardModel } from '../../generated/prisma/models';

export const cardRouter = Router()

// GET api/cards
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
        return res.status(500).json({error: 'Erreur serveur'})
    }
})