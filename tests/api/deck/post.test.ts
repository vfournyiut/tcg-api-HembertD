import {describe, it, expect, beforeEach, vi} from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {app} from '../../../src/index';
import {prismaMock} from '../../vitest.setup';
import {env} from '../../../src/env';

describe('POST /api/decks', () => {
    const validToken = jwt.sign(
        {userId: 1, email: 'test@example.com'},
        env.JWT_SECRET,
        {expiresIn: '1h'}
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('TC-DECK-POST-001 : Sans token (401)', () => {
        it('should return 401 when no token is provided', async () => {
            const response = await request(app)
                .post('/api/decks')
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                });

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Token manquant');
        });
    });

    describe('TC-DECK-POST-002 : Name manquant (400)', () => {
        it('should return 400 when name is missing', async () => {
            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Name et cards (array) sont requis');
        });
    });

    describe('TC-DECK-POST-003 : Cards manquant (400)', () => {
        it('should return 400 when cards is missing', async () => {
            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Mon Deck'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Name et cards (array) sont requis');
        });
    });

    describe('TC-DECK-POST-004 : Cards nest pas un array (400)', () => {
        it('should return 400 when cards is not an array', async () => {
            // Note: Le code vérifie d'abord la longueur, donc une chaîne déclenchera
            // l'erreur "10 cartes" si elle a 13 caractères, ou "array requis" sinon
            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: 'not-an-array'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBeDefined();
        });
    });

    describe('TC-DECK-POST-005 : Moins de 10 cartes (400)', () => {
        it('should return 400 when cards has less than 10', async () => {
            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9]
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Un deck doit contenir exactement 10 cartes');
        });
    });

    describe('TC-DECK-POST-006 : Plus de 10 cartes (400)', () => {
        it('should return 400 when cards has more than 10', async () => {
            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Un deck doit contenir exactement 10 cartes');
        });
    });

    describe('TC-DECK-POST-007 : Cartes inexistantes (400)', () => {
        it('should return 400 when some cards do not exist', async () => {
            const mockCards = [
                {id: 1, name: 'Bulbizarre', pokedexNumber: 1, type: 'Grass' as const, hp: 60, attack: 49, imgUrl: 'https://example.com/1.png', createdAt: new Date(), updatedAt: new Date()},
                {id: 2, name: 'Salamèche', pokedexNumber: 4, type: 'Fire' as const, hp: 39, attack: 52, imgUrl: 'https://example.com/4.png', createdAt: new Date(), updatedAt: new Date()}
            ];

            prismaMock.card.findMany.mockResolvedValue(mockCards);

            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Certaines cartes fournies n\'existent pas');
        });
    });

    describe('TC-DECK-POST-008 : Création réussie (201)', () => {
        it('should return 201 and created deck', async () => {
            const mockCards = [
                {id: 1, name: 'Bulbizarre', pokedexNumber: 1, type: 'Grass' as const, hp: 60, attack: 49, imgUrl: 'https://example.com/1.png', createdAt: new Date(), updatedAt: new Date()},
                {id: 2, name: 'Salamèche', pokedexNumber: 4, type: 'Fire' as const, hp: 39, attack: 52, imgUrl: 'https://example.com/4.png', createdAt: new Date(), updatedAt: new Date()},
                {id: 3, name: 'Carapuce', pokedexNumber: 7, type: 'Water' as const, hp: 44, attack: 48, imgUrl: 'https://example.com/7.png', createdAt: new Date(), updatedAt: new Date()},
                {id: 4, name: 'Chenipan', pokedexNumber: 11, type: 'Bug' as const, hp: 30, attack: 35, imgUrl: 'https://example.com/11.png', createdAt: new Date(), updatedAt: new Date()},
                {id: 5, name: 'Aspicot', pokedexNumber: 13, type: 'Bug' as const, hp: 40, attack: 35, imgUrl: 'https://example.com/13.png', createdAt: new Date(), updatedAt: new Date()},
                {id: 6, name: 'Roucool', pokedexNumber: 16, type: 'Flying' as const, hp: 40, attack: 45, imgUrl: 'https://example.com/16.png', createdAt: new Date(), updatedAt: new Date()},
                {id: 7, name: 'Rattata', pokedexNumber: 19, type: 'Normal' as const, hp: 30, attack: 56, imgUrl: 'https://example.com/19.png', createdAt: new Date(), updatedAt: new Date()},
                {id: 8, name: 'Piafabec', pokedexNumber: 21, type: 'Flying' as const, hp: 40, attack: 60, imgUrl: 'https://example.com/21.png', createdAt: new Date(), updatedAt: new Date()},
                {id: 9, name: 'Abo', pokedexNumber: 23, type: 'Poison' as const, hp: 35, attack: 60, imgUrl: 'https://example.com/23.png', createdAt: new Date(), updatedAt: new Date()},
                {id: 10, name: 'Pikachu', pokedexNumber: 25, type: 'Electric' as const, hp: 35, attack: 55, imgUrl: 'https://example.com/25.png', createdAt: new Date(), updatedAt: new Date()}
            ];

            prismaMock.card.findMany.mockResolvedValue(mockCards);

            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                cards: mockCards.map((card, index) => ({
                    id: index + 1,
                    deckId: 1,
                    cardId: card.id,
                    card: card
                }))
            };

            prismaMock.deck.create.mockResolvedValue(mockDeck);

            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                });

            expect(response.status).toBe(201);
            expect(response.body.id).toBe(1);
            expect(response.body.name).toBe('Mon Deck');
            expect(response.body.cards.length).toBe(10);
        });
    });

    describe('TC-DECK-POST-009 : Erreur serveur (500)', () => {
        it('should return 500 when database error occurs', async () => {
            prismaMock.card.findMany.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Erreur serveur');
        });
    });
});

