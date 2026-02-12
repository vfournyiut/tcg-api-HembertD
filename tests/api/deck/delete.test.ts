import {describe, it, expect, beforeEach, vi} from 'vitest';
import request from 'supertest';
import {app} from '../../../src/index';
import {prismaMock} from '../../vitest.setup';
import {createValidToken, createMockDeck} from '../../utils/api';

describe('DELETE /api/decks/:id', () => {
    const validToken = createValidToken(1, 'test@example.com');

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('TC-DECK-DELETE-001 : Sans token (401)', () => {
        it('should return 401 when no token is provided', async () => {
            const response = await request(app).delete('/api/decks/1');
            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Token manquant');
        });
    });

    describe('TC-DECK-DELETE-002 : ID invalide (400)', () => {
        it('should return 400 for non-numeric deck ID', async () => {
            const response = await request(app)
                .delete('/api/decks/invalid')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('ID de deck invalide');
        });

        it('should return 400 for NaN deck ID', async () => {
            const response = await request(app)
                .delete('/api/decks/abc123')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(400);
        });
    });

    describe('TC-DECK-DELETE-003 : Deck inexistant (404)', () => {
        it('should return 404 when deck does not exist', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null);

            const response = await request(app)
                .delete('/api/decks/999')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Deck non trouvé');
        });
    });

    describe('TC-DECK-DELETE-004 : Deck dun autre utilisateur (404)', () => {
        it('should return 404 when deck belongs to another user', async () => {
            prismaMock.deck.findFirst.mockResolvedValue(null);

            const response = await request(app)
                .delete('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('TC-DECK-DELETE-005 : Suppression réussie (204)', () => {
        it('should return 204 when deck is successfully deleted', async () => {
            const mockDeck = createMockDeck(1);
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck);
            prismaMock.deck.delete.mockResolvedValue(mockDeck);

            const response = await request(app)
                .delete('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(204);
            expect(response.body).toEqual({});
        });

        it('should call prisma.deck.delete with correct id', async () => {
            const mockDeck = createMockDeck(1, {id: 5});
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck);
            prismaMock.deck.delete.mockResolvedValue(mockDeck);

            await request(app)
                .delete('/api/decks/5')
                .set('Authorization', `Bearer ${validToken}`);

            expect(prismaMock.deck.delete).toHaveBeenCalledWith({where: {id: 5}});
        });
    });

    describe('TC-DECK-DELETE-006 : Erreur serveur (500)', () => {
        it('should return 500 when database error occurs on findFirst', async () => {
            prismaMock.deck.findFirst.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .delete('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Erreur serveur');
        });

        it('should return 500 when database error occurs on delete', async () => {
            const mockDeck = createMockDeck(1);
            prismaMock.deck.findFirst.mockResolvedValue(mockDeck);
            prismaMock.deck.delete.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .delete('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Erreur serveur');
        });
    });
});

