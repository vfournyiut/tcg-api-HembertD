import {describe, it, expect, beforeEach, vi} from 'vitest';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import {app} from '../../../src/index';
import {prismaMock} from '../../vitest.setup';
import {createValidToken, createMockUser} from '../../utils/api';
import jwt from 'jsonwebtoken';
import {env} from '../../../src/env';

describe('POST /api/auth/sign-in', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('TC-SIGNIN-001 : Email manquant (400)', () => {
        it('should return 400 when email is missing', async () => {
            const response = await request(app)
                .post('/api/auth/sign-in')
                .send({password: 'password123'});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Email et password sont requis');
        });
    });

    describe('TC-SIGNIN-002 : Password manquant (400)', () => {
        it('should return 400 when password is missing', async () => {
            const response = await request(app)
                .post('/api/auth/sign-in')
                .send({email: 'test@example.com'});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Email et password sont requis');
        });
    });

    describe('TC-SIGNIN-003 : Email inexistant (401)', () => {
        it('should return 401 when email does not exist', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/auth/sign-in')
                .send({email: 'nonexistent@example.com', password: 'password123'});

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Email ou mot de passe incorrect');
        });
    });

    describe('TC-SIGNIN-004 : Mauvais password (401)', () => {
        it('should return 401 when password is incorrect', async () => {
            prismaMock.user.findUnique.mockResolvedValue(createMockUser());
            vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

            const response = await request(app)
                .post('/api/auth/sign-in')
                .send({email: 'test@example.com', password: 'wrongpassword'});

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Email ou mot de passe incorrect');
        });
    });

    describe('TC-SIGNIN-005 : Connexion réussie (200)', () => {
        it('should return 200 and token when credentials are valid', async () => {
            prismaMock.user.findUnique.mockResolvedValue(createMockUser());
            vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

            const response = await request(app)
                .post('/api/auth/sign-in')
                .send({email: 'test@example.com', password: 'password123'});

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Connexion réussie');
            expect(response.body.token).toBeDefined();
            expect(response.body.user).toEqual({id: 1, username: 'testuser', email: 'test@example.com'});
        });

        it('should generate a valid JWT token with correct payload', async () => {
            const user = createMockUser({id: 42, email: 'validuser@example.com', username: 'validuser'});
            prismaMock.user.findUnique.mockResolvedValue(user);
            vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

            const response = await request(app)
                .post('/api/auth/sign-in')
                .send({email: 'validuser@example.com', password: 'password123'});

            const decoded = jwt.verify(response.body.token, env.JWT_SECRET) as { userId: number; email: string };
            expect(decoded.userId).toBe(42);
            expect(decoded.email).toBe('validuser@example.com');
        });

        it('should have token with 24h expiration', async () => {
            prismaMock.user.findUnique.mockResolvedValue(createMockUser());
            vi.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

            const response = await request(app)
                .post('/api/auth/sign-in')
                .send({email: 'test@example.com', password: 'password123'});

            const decoded = jwt.verify(response.body.token, env.JWT_SECRET) as { exp: number };
            const now = Math.floor(Date.now() / 1000);
            const expectedExpiration = now + 24 * 60 * 60;
            expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiration - 5);
            expect(decoded.exp).toBeLessThanOrEqual(expectedExpiration + 5);
        });
    });

    describe('TC-SIGNIN-006 : Erreur serveur (500)', () => {
        it('should return 500 when database error occurs', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/auth/sign-in')
                .send({email: 'test@example.com', password: 'password123'});

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Erreur serveur');
        });

        it('should return 500 when bcrypt compare throws error', async () => {
            prismaMock.user.findUnique.mockResolvedValue(createMockUser());
            vi.spyOn(bcrypt, 'compare').mockRejectedValue(new Error('Bcrypt error'));

            const response = await request(app)
                .post('/api/auth/sign-in')
                .send({email: 'test@example.com', password: 'password123'});

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Erreur serveur');
        });
    });
});

