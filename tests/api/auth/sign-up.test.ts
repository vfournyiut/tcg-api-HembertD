import {describe, it, expect, beforeEach, vi} from 'vitest';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {app} from '../../../src/index';
import {prismaMock} from '../../vitest.setup';
import {env} from '../../../src/env';
import {createMockUser} from '../../utils/api';

describe('POST /api/auth/sign-up', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('TC-SIGNUP-001 : Email manquant (400)', () => {
        it('should return 400 when email is missing', async () => {
            const response = await request(app)
                .post('/api/auth/sign-up')
                .send({username: 'testuser', password: 'password123'});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Email, username et password sont requis');
        });
    });

    describe('TC-SIGNUP-002 : Username manquant (400)', () => {
        it('should return 400 when username is missing', async () => {
            const response = await request(app)
                .post('/api/auth/sign-up')
                .send({email: 'test@example.com', password: 'password123'});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Email, username et password sont requis');
        });
    });

    describe('TC-SIGNUP-003 : Password manquant (400)', () => {
        it('should return 400 when password is missing', async () => {
            const response = await request(app)
                .post('/api/auth/sign-up')
                .send({email: 'test@example.com', username: 'testuser'});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Email, username et password sont requis');
        });
    });

    describe('TC-SIGNUP-004 : Format email invalide (400)', () => {
        it('should return 400 for invalid email format', async () => {
            const response = await request(app)
                .post('/api/auth/sign-up')
                .send({email: 'invalid-email', username: 'testuser', password: 'password123'});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe("Format d'email invalide");
        });

        it('should return 400 for email without @', async () => {
            const response = await request(app)
                .post('/api/auth/sign-up')
                .send({email: 'testexample.com', username: 'testuser', password: 'password123'});

            expect(response.status).toBe(400);
        });

        it('should return 400 for email without domain', async () => {
            const response = await request(app)
                .post('/api/auth/sign-up')
                .send({email: 'test@', username: 'testuser', password: 'password123'});

            expect(response.status).toBe(400);
        });
    });

    describe('TC-SIGNUP-005 : Password trop court (400)', () => {
        it('should return 400 when password has less than 6 characters', async () => {
            const response = await request(app)
                .post('/api/auth/sign-up')
                .send({email: 'test@example.com', username: 'testuser', password: '12345'});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Le mot de passe doit contenir au moins 6 caractères');
        });
    });

    describe('TC-SIGNUP-006 : Email déjà utilisé (409)', () => {
        it('should return 409 when email is already registered', async () => {
            prismaMock.user.findUnique.mockResolvedValue(createMockUser({email: 'existing@example.com', username: 'existinguser'}));

            const response = await request(app)
                .post('/api/auth/sign-up')
                .send({email: 'existing@example.com', username: 'testuser', password: 'password123'});

            expect(response.status).toBe(409);
            expect(response.body.error).toBe('Cet email est déjà utilisé');
        });
    });

    describe('TC-SIGNUP-007 : Username déjà utilisé (409)', () => {
        it('should return 409 when username is already registered', async () => {
            prismaMock.user.findUnique
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(createMockUser({id: 1, email: 'test@example.com', username: 'existinguser'}));

            const response = await request(app)
                .post('/api/auth/sign-up')
                .send({email: 'test@example.com', username: 'existinguser', password: 'password123'});

            expect(response.status).toBe(409);
            expect(response.body.error).toBe('Ce nom d\'utilisateur est déjà utilisé');
        });
    });

    describe('TC-SIGNUP-008 : Inscription réussie (201)', () => {
        it('should return 201 and token when signup is successful', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password');
            prismaMock.user.create.mockResolvedValue(createMockUser({
                id: 1,
                email: 'newuser@example.com',
                username: 'newuser'
            }));

            const response = await request(app)
                .post('/api/auth/sign-up')
                .send({email: 'newuser@example.com', username: 'newuser', password: 'password123'});

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Inscription réussie');
            expect(response.body.token).toBeDefined();
            expect(response.body.user).toEqual({id: 1, username: 'newuser', email: 'newuser@example.com'});
        });

        it('should generate a valid JWT token', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password');
            prismaMock.user.create.mockResolvedValue(createMockUser({
                id: 42,
                email: 'tokenuser@example.com',
                username: 'tokenuser'
            }));

            const response = await request(app)
                .post('/api/auth/sign-up')
                .send({email: 'tokenuser@example.com', username: 'tokenuser', password: 'password123'});

            const decoded = jwt.verify(response.body.token, env.JWT_SECRET) as { userId: number; email: string };
            expect(decoded.userId).toBe(42);
            expect(decoded.email).toBe('tokenuser@example.com');
        });
    });

    describe('TC-SIGNUP-009 : Erreur serveur (500)', () => {
        it('should return 500 when database error occurs', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/auth/sign-up')
                .send({email: 'test@example.com', username: 'testuser', password: 'password123'});

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Erreur serveur');
        });
    });
});

