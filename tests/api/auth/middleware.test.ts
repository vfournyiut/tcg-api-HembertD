import {describe, it, expect, vi, beforeEach} from 'vitest';
import {mockDeep, mockReset} from 'vitest-mock-extended';
import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {authenticateToken} from '../../../src/api/auth/middleware';
import {env} from '../../../src/env';
import {prisma} from '../../../src/database';

vi.mock('../../../src/database', () => ({
    prisma: mockDeep<typeof prisma>()
}));

describe('authenticateToken', () => {
    let mockRequest: Request;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockReset(prisma);
        mockRequest = {
            headers: {},
        } as unknown as Request;
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        mockNext = vi.fn();
    });

    describe('TC-AUTH-MW-001 : Token absent (401)', () => {
        it('should return 401 when Authorization header is missing', () => {
            authenticateToken(
                mockRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({error: 'Token manquant'});
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 when Authorization header is empty', () => {
            mockRequest.headers = {authorization: ''};

            authenticateToken(
                mockRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({error: 'Token manquant'});
        });
    });

    describe('TC-AUTH-MW-002 : Token invalide (401)', () => {
        it('should return 401 for invalid token', () => {
            mockRequest.headers = {authorization: 'Bearer invalid-token'};

            authenticateToken(
                mockRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({error: 'Token invalide ou expiré'});
        });

        it('should return 401 for malformed token', () => {
            mockRequest.headers = {authorization: 'MalformedToken'};

            authenticateToken(
                mockRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });
    });

    describe('TC-AUTH-MW-003 : Token expiré (401)', () => {
        it('should return 401 for expired token', () => {
            const expiredToken = jwt.sign(
                {userId: 1, email: 'test@example.com'},
                env.JWT_SECRET,
                {expiresIn: '-1s'}
            );
            mockRequest.headers = {authorization: `Bearer ${expiredToken}`};

            authenticateToken(
                mockRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({error: 'Token invalide ou expiré'});
        });
    });

    describe('TC-AUTH-MW-004 : Token valide (200)', () => {
        it('should call next() and set req.user for valid token', () => {
            const validToken = jwt.sign(
                {userId: 1, email: 'test@example.com'},
                env.JWT_SECRET,
                {expiresIn: '1h'}
            );
            mockRequest.headers = {authorization: `Bearer ${validToken}`};

            authenticateToken(
                mockRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockRequest.user).toEqual({
                userId: 1,
                email: 'test@example.com'
            });
        });

        it('should work with different user data', () => {
            const validToken = jwt.sign(
                {userId: 42, email: 'user42@example.com'},
                env.JWT_SECRET,
                {expiresIn: '1h'}
            );
            mockRequest.headers = {authorization: `Bearer ${validToken}`};

            authenticateToken(
                mockRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockRequest.user).toEqual({
                userId: 42,
                email: 'user42@example.com'
            });
        });
    });

    describe('TC-AUTH-MW-005 : Format Bearer TOKEN', () => {
        it('should extract token from Bearer format', () => {
            const validToken = jwt.sign(
                {userId: 1, email: 'test@example.com'},
                env.JWT_SECRET,
                {expiresIn: '1h'}
            );
            mockRequest.headers = {authorization: `Bearer ${validToken}`};

            authenticateToken(
                mockRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockRequest.user?.userId).toBe(1);
        });
    });

    describe('TC-AUTH-MW-006 : decoded undefined (403)', () => {
        it('should return 403 when decoded is undefined', () => {
            // Mock jwt.verify to return undefined
            vi.spyOn(jwt, 'verify').mockReturnValue(undefined as any);
            const validToken = 'some-token';
            mockRequest.headers = {authorization: `Bearer ${validToken}`};

            authenticateToken(
                mockRequest,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({error: 'Accès interdit'});
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});

