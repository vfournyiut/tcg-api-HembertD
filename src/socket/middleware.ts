import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

import { env } from '../env';

/**
 * Interface pour les données utilisateur injectées dans le socket
 */
export interface SocketUser {
  userId: number;
  email: string;
}

/**
 * Interface étendue du socket avec les informations utilisateur
 */
export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

/**
 * Middleware d'authentification JWT pour Socket.io
 * Vérifie le token JWT envoyé dans socket.handshake.auth.token
 * 
 * @param {AuthenticatedSocket} socket - Socket.io socket instance
 * @param {Function} next - Callback pour passer au prochain middleware
 * @returns {void|Error} Erreur si authentification échouée, sinon next()
 * 
 * @throws {Error} Token manquant
 * @throws {Error} Token invalide ou expiré
 */
export const socketAuthMiddleware = (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void,
): void => {
  // 1. Récupérer le token depuis handshake auth
  const token = socket.handshake.auth.token;

  // 2. Vérifier la présence du token
  if (!token) {
    return next(new Error('Token manquant'));
  }

  try {
    // 3. Vérifier et décoder le token JWT
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: number;
      email: string;
    };

    // 4. Injecter les informations utilisateur dans le socket
    socket.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    // 5. Passer au prochain middleware
    return next();
  } catch (_error) {
    return next(new Error('Token invalide ou expiré'));
  }
};
