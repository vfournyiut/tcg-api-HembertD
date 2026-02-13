import {Request, Response, Router} from 'express'

import {prisma} from "../../database";
import { DeckModel } from '../../generated/prisma/models';
import {authenticateToken} from "../auth/middleware";

const router = Router()

/**
 * Route pour supprimer un deck
 * Supprime un deck existant (avec suppression en cascade des DeckCard)
 * 
 * @route DELETE /:id
 * @description Supprime un deck existant (avec suppression en cascade des DeckCard)
 * @param {number} req.params.id - ID du deck à supprimer (requis)
 * @requires Token JWT d'authentification
 * @returns {204} Suppression réussie (sans contenu)
 * @returns {400} ID de deck invalide
 * @returns {404} Deck non trouvé ou n'appartient pas à l'utilisateur
 * @returns {500} Erreur lors de la suppression du deck
 * @throws {400} ID de deck invalide
 * @throws {404} Deck non trouvé
 * @throws {500} Erreur lors de la suppression du deck
 */
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

