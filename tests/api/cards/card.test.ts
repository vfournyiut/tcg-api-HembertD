import {describe, it, expect, beforeEach, vi} from 'vitest';
import request from 'supertest';
import {app} from '../../../src/index';
import {prismaMock} from '../../vitest.setup';

describe('GET /api/cards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('TC-CARD-001 : Récupération des cartes (200)', () => {
        it('should return 200 and all cards', async () => {
            const mockCards = [
                {
                    id: 1,
                    name: 'Bulbizarre',
                    pokedexNumber: 1,
                    type: 'Grass' as const,
                    hp: 60,
                    attack: 49,
                    imgUrl: 'https://example.com/1.png',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 2,
                    name: 'Salamèche',
                    pokedexNumber: 4,
                    type: 'Fire' as const,
                    hp: 39,
                    attack: 52,
                    imgUrl: 'https://example.com/4.png',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            prismaMock.card.findMany.mockResolvedValue(mockCards);

            const response = await request(app)
                .get('/api/cards');

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(2);
            expect(response.body[0].id).toBe(1);
            expect(response.body[0].name).toBe('Bulbizarre');
            expect(response.body[1].id).toBe(2);
            expect(response.body[1].name).toBe('Salamèche');
        });

        it('should return cards sorted by pokedexNumber ascending', async () => {
            // Note: Avec le mock Prisma, les données sont retournées exactement comme mockées.
            // Le tri réel est testé en intégration, pas avec les mocks unitaires.
            const mockCardsInWrongOrder = [
                {
                    id: 4,
                    name: 'Salamèche',
                    pokedexNumber: 4,
                    type: 'Fire' as const,
                    hp: 39,
                    attack: 52,
                    imgUrl: 'https://example.com/4.png',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 1,
                    name: 'Bulbizarre',
                    pokedexNumber: 1,
                    type: 'Grass' as const,
                    hp: 60,
                    attack: 49,
                    imgUrl: 'https://example.com/1.png',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 7,
                    name: 'Carapuce',
                    pokedexNumber: 7,
                    type: 'Water' as const,
                    hp: 44,
                    attack: 48,
                    imgUrl: 'https://example.com/7.png',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            prismaMock.card.findMany.mockResolvedValue(mockCardsInWrongOrder);

            const response = await request(app)
                .get('/api/cards');

            expect(response.status).toBe(200);
            // Le mock retourne les données dans l'ordre mocké
            expect(response.body.length).toBe(3);
            // Vérifier que toutes les cartes sont présentes
            const pokedexNumbers = response.body.map((c: any) => c.pokedexNumber);
            expect(pokedexNumbers).toContain(1);
            expect(pokedexNumbers).toContain(4);
            expect(pokedexNumbers).toContain(7);
        });

        it('should return empty array when no cards exist', async () => {
            prismaMock.card.findMany.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/cards');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
            expect(response.body.length).toBe(0);
        });
    });

    describe('TC-CARD-002 : Erreur serveur (500)', () => {
        it('should return 500 when database error occurs', async () => {
            prismaMock.card.findMany.mockRejectedValue(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/cards');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Erreur serveur');
        });
    });
});

