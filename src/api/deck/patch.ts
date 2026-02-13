import {Request, Response, Router} from 'express'

import {prisma} from "../../database";
import { CardModel, DeckModel } from '../../generated/prisma/models';
import {authenticateToken} from "../auth/middleware";

const router = Router()

/**
 * Route pour mettre à jour un deck existant
 * Met à jour le nom et/ou les cartes d'un deck existant appartenant à l'utilisateur
 * 
 * @route PATCH /:id
 * @description Met à jour le nom et/ou les cartes d'un deck existant appartenant à l'utilisateur
 * @param {number} req.params.id - ID du deck à mettre à jour (requis)
 * @param {string} [req.body.name] - Nouveau nom du deck (optionnel)
 * @param {number[]} [req.body.cards] - Nouveau tableau de 10 IDs de cartes (optionnel)
 * @requires Token JWT d'authentification
 * @returns {200} Le DeckModel mis à jour
 * @returns {400} ID de deck invalide
 * @returns {400} Cards n'est pas un array
 * @returns {400} Le deck ne contient pas exactement 10 cartes
 * @returns {400} Certaines cartes n'existent pas
 * @returns {404} Deck non trouvé ou n'appartient pas à l'utilisateur
 * @returns {500} Erreur lors de la mise à jour du deck
 * @throws {400} ID de deck invalide
 * @throws {400} Cards doit être un array
 * @throws {400} Un deck doit contenir exactement 10 cartes
 * @throws {400} Certaines cartes fournies n'existent pas
 * @throws {404} Deck non trouvé
 * @throws {500} Erreur lors de la mise à jour du deck
 */
router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
    const deckId : number = parseInt(req.params.id)
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

