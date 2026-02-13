import {Request, Response, Router} from 'express'

import {prisma} from "../../database";
import { CardModel, DeckModel } from '../../generated/prisma/models';
import {authenticateToken} from "../auth/middleware";

const router = Router()

/**
 * Route pour créer un nouveau deck
 * Crée un nouveau deck pour l'utilisateur avec 10 cartes sélectionnées
 * 
 * @route POST /
 * @description Crée un nouveau deck pour l'utilisateur avec 10 cartes sélectionnées
 * @param {string} req.body.name - Nom du deck (requis)
 * @param {number[]} req.body.cards - Tableau d'IDs de cartes (requis, exactement 10 cartes)
 * @requires Token JWT d'authentification
 * @returns {201} Le DeckModel créé incluant les cartes
 * @returns {400} Name et cards manquants
 * @returns {400} Le deck ne contient pas exactement 10 cartes
 * @returns {400} Certaines cartes n'existent pas
 * @returns {500} Erreur lors de la création du deck
 * @throws {400} Name et cards (array) sont requis
 * @throws {400} Un deck doit contenir exactement 10 cartes
 * @throws {400} Certaines cartes fournies n'existent pas
 * @throws {500} Erreur lors de la création du deck
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    const name : string = req.body.name
    const cards : number[] = req.body.cards
    const userId = req.user?.userId

    if (!name || !cards) {
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

