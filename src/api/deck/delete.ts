import {Request, Response, Router} from 'express'
import {prisma} from "../../database";
import {authenticateToken} from "../auth/middleware";
import { DeckModel } from '../../generated/prisma/models';

const router = Router()

// DELETE /api/decks/:id
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    const deckId : number = parseInt(req.params.id)
    const userId = req.user?.userId

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

        // Delete the deck (cascade will delete deckCards because of foreign key constraint)
        await prisma.deck.delete({
            where: {
                id: deckId,
            },
        })

        return res.status(204).send()
    } catch (error) {
        console.error('Erreur lors de la suppression du deck:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

export default router

