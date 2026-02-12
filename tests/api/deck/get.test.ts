import {describe, it, expect, beforeEach, vi} from 'vitest';
import request from 'supertest';
import {app} from '../../../src/index';
import {prismaMock} from '../../vitest.setup';
import {createValidToken, createMockDeck, createMockDeckWithCards} from '../../utils/api';

describe('GET /api/decks', () => {
    const validToken = createValidToken(1, 'test@example.com');

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('TC-DECK-GET-001 : Sans token (401)', () => {
        it('should return 401 when no token is provided', async () => {
            const response = await request(app).get('/api/decks/mine');
            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Token manquant');
        });
    });

    describe('TC-DECK-GET-002 : Avec token valide (200)', () => {
        it('should return 200 and user decks', async () => {
            const mockDecks = [createMockDeck(1)];
            prismaMock.deck.findMany.mockResolvedValue(mockDecks);

            const response = await request(app)
                .get('/api/decks/mine')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].id).toBe(1);
            expect(response.body[0].name).toBe('Mon Deck');
            expect(response.body[0].userId).toBe(1);
        });
    });

    describe('TC-DECK-GET-003 : Tableau vide', () => {
        it('should return empty array when user has no decks', async () => {
            prismaMock.deck.findMany.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/decks/mine')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe('TC-DECK-GET-004 : ID invalide (400)', () => {
        it('should return 400 for non-numeric deck ID', async () => {
            const response = await request(app)
                .get('/api/decks/invalid')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('ID de deck invalide');
        });

        it('should return 400 for NaN deck ID', async () => {
            const response = await request(app)
                .get('/api/decks/abc123')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(400);
        });
    });

    describe('TC-DECK-GET-005 : Deck inexistant (404)', () => {
        it('should return 404 when deck does not exist', async () => {
            prismaMock.deck.findUnique.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/decks/999')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Deck non trouvé');
        });
    });

    describe('TC-DECK-GET-006 : Deck dun autre utilisateur (404)', () => {
        it('should return 404 when deck belongs to another user', async () => {
            prismaMock.deck.findUnique.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('TC-DECK-GET-007 : Deck existant (200)', () => {
        it('should return 200 and deck when found', async () => {
            const mockDeck = createMockDeckWithCards(1);
            prismaMock.deck.findUnique.mockResolvedValue(mockDeck);

            const response = await request(app)
                .get('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(1);
            expect(response.body.name).toBe('Mon Deck');
        });
    });

    describe('TC-DECK-GET-008 : Erreur serveur (500)', () => {
        it('should return 500 when database error occurs on GET /mine', async () => {
            prismaMock.deck.findMany.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/decks/mine')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Erreur serveur');
        });

        it('should return 500 when database error occurs on GET /:id', async () => {
            prismaMock.deck.findUnique.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Erreur serveur');
        });
    });
});

