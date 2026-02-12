import {describe, it, expect, beforeEach, vi} from 'vitest';
import request from 'supertest';
import {app} from '../../../src/index';
import {prismaMock} from '../../vitest.setup';
import {createValidToken, createMockDeck, createMockDeckWithCards, createValidDeckCards} from '../../utils/api';

describe('PATCH /api/decks/:id', () => {
    const validToken = createValidToken(1, 'test@example.com');
    const validCards = createValidDeckCards();

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
            prismaMock.deck.findFirst.mockResolvedValue(createMockDeck(1));

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
            prismaMock.deck.findFirst.mockResolvedValue(createMockDeck(1));

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
            prismaMock.deck.findFirst.mockResolvedValue(createMockDeck(1));

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
            prismaMock.deck.findFirst.mockResolvedValue(createMockDeck(1));
            prismaMock.card.findMany.mockResolvedValue(validCards.slice(0, 2));

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
            const mockDeck = createMockDeck(1, {name: 'Ancien Nom'});
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck);
            prismaMock.deck.update.mockResolvedValue({...mockDeck, name: 'Nouveau Nom'});
            prismaMock.deck.findUnique.mockResolvedValue(createMockDeck(1, {name: 'Nouveau Nom'}));

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
            prismaMock.deck.findFirst.mockResolvedValue(createMockDeck(1));
            prismaMock.card.findMany.mockResolvedValue(validCards);
            prismaMock.deck.findUnique.mockResolvedValue(createMockDeckWithCards(1));

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
            const mockDeckWithCards = createMockDeckWithCards(1);
            prismaMock.deck.findFirst.mockResolvedValue(createMockDeck(1, {name: 'Ancien Nom'}));
            prismaMock.card.findMany.mockResolvedValue(validCards);
            prismaMock.deck.findUnique.mockResolvedValue({...mockDeckWithCards, name: 'Nouveau Nom'});

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

