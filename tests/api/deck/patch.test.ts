import {describe, it, expect, beforeEach, vi} from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {app} from '../../../src/index';
import {prismaMock} from '../../vitest.setup';
import {env} from '../../../src/env';

describe('PATCH /api/decks/:id', () => {
    const validToken = jwt.sign(
        {userId: 1, email: 'test@example.com'},
        env.JWT_SECRET,
        {expiresIn: '1h'}
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('TC-DECK-PATCH-001 : Sans token (401)', () => {
        it('should return 401 when no token is provided', async () => {
            const response = await request(app)
                .patch('/api/decks/1')
                .send({name: 'Nouveau Nom'});

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Token manquant');
        });
    });

    describe('TC-DECK-PATCH-002 : ID invalide (400)', () => {
        it('should return 400 for non-numeric deck ID', async () => {
            const response = await request(app)
                .patch('/api/decks/invalid')
                .set('Authorization', `Bearer ${validToken}`)
                .send({name: 'Nouveau Nom'});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('ID de deck invalide');
        });
    });

    describe('TC-DECK-PATCH-003 : Deck inexistant (404)', () => {
        it('should return 404 when deck does not exist', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null);

            const response = await request(app)
                .patch('/api/decks/999')
                .set('Authorization', `Bearer ${validToken}`)
                .send({name: 'Nouveau Nom'});

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Deck non trouvé');
        });
    });

    describe('TC-DECK-PATCH-004 : Deck dun autre utilisateur (404)', () => {
        it('should return 404 when deck belongs to another user', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null);

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({name: 'Nouveau Nom'});

            expect(response.status).toBe(404);
        });
    });

    describe('TC-DECK-PATCH-005 : Cards nest pas un array (400)', () => {
        it('should return 400 when cards is not an array', async () => {
            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            prismaMock.deck.findFirst.mockResolvedValue(mockDeck);

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({cards: 'not-an-array'});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Cards doit être un array');
        });
    });

    describe('TC-DECK-PATCH-006 : Moins de 10 cartes (400)', () => {
        it('should return 400 when cards has less than 10', async () => {
            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            prismaMock.deck.findFirst.mockResolvedValue(mockDeck);

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({cards: [1, 2, 3, 4, 5, 6, 7, 8, 9]});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Un deck doit contenir exactement 10 cartes');
        });
    });

    describe('TC-DECK-PATCH-007 : Plus de 10 cartes (400)', () => {
        it('should return 400 when cards has more than 10', async () => {
            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            prismaMock.deck.findFirst.mockResolvedValue(mockDeck);

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Un deck doit contenir exactement 10 cartes');
        });
    });

    describe('TC-DECK-PATCH-008 : Cartes inexistantes (400)', () => {
        it('should return 400 when some cards do not exist', async () => {
            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            prismaMock.deck.findFirst.mockResolvedValue(mockDeck);

            const mockCards = [
                {id: 1, name: 'Bulbizarre', pokedexNumber: 1, type: 'Grass' as const, hp: 60, attack: 49, imgUrl: 'https://example.com/1.png', createdAt: new Date(), updatedAt: new Date()},
                {id: 2, name: 'Salamèche', pokedexNumber: 4, type: 'Fire' as const, hp: 39, attack: 52, imgUrl: 'https://example.com/4.png', createdAt: new Date(), updatedAt: new Date()}
            ];

            prismaMock.card.findMany.mockResolvedValue(mockCards);

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Certaines cartes fournies n\'existent pas');
        });
    });

    describe('TC-DECK-PATCH-009 : Mise à jour du nom uniquement (200)', () => {
        it('should return 200 when updating only the name', async () => {
            const mockDeck = {
                id: 1,
                name: 'Ancien Nom',
                userId: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            prismaMock.deck.findFirst.mockResolvedValue(mockDeck);
            prismaMock.deck.update.mockResolvedValue({
                ...mockDeck,
                name: 'Nouveau Nom'
            });

            const mockUpdatedDeck = {
                id: 1,
                name: 'Nouveau Nom',
                userId: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                cards: []
            };

            prismaMock.deck.findUnique.mockResolvedValue(mockUpdatedDeck);

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({name: 'Nouveau Nom'});

            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Nouveau Nom');
        });
    });

    describe('TC-DECK-PATCH-010 : Mise à jour des cartes uniquement (200)', () => {
        it('should return 200 when updating only the cards', async () => {
            const mockDeck = {
                id: 1,
                name: 'Mon Deck',
                userId: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            prismaMock.deck.findFirst.mockResolvedValue(mockDeck);

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

            const mockUpdatedDeck = {
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

            prismaMock.deck.findUnique.mockResolvedValue(mockUpdatedDeck);

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]});

            expect(response.status).toBe(200);
            expect(response.body.cards.length).toBe(10);
        });
    });

    describe('TC-DECK-PATCH-011 : Mise à jour du nom et des cartes (200)', () => {
        it('should return 200 when updating both name and cards', async () => {
            const mockDeck = {
                id: 1,
                name: 'Ancien Nom',
                userId: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            prismaMock.deck.findFirst.mockResolvedValue(mockDeck);

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

            const mockUpdatedDeck = {
                id: 1,
                name: 'Nouveau Nom',
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

            prismaMock.deck.findUnique.mockResolvedValue(mockUpdatedDeck);

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({name: 'Nouveau Nom', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]});

            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Nouveau Nom');
            expect(response.body.cards.length).toBe(10);
        });
    });

    describe('TC-DECK-PATCH-012 : Erreur serveur (500)', () => {
        it('should return 500 when database error occurs', async () => {
            prismaMock.deck.findFirst.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({name: 'Nouveau Nom'});

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Erreur serveur');
        });
    });
});
