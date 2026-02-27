import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

import { env } from '../../env'

/**
 * Middleware d'authentification par token JWT
 * Vérifie la présence et la validité du token JWT dans l'en-tête Authorization
 * 
 * @param {Request} req - Requête Express contenant les headers avec Authorization
 * @param {Response} res - Réponse Express
 * @param {NextFunction} next - Fonction next d'Express
 * @returns {Response|void} 401 si token manquant, 403 si utilisateur non trouvé, 401 si token invalide, sinon next()
 * @throws {401} Token manquant dans les headers
 * @throws {401} Token invalide ou expiré
 * @throws {403} Accès interdit (utilisateur non trouvé)
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 1. Récupérer le token depuis l'en-tête Authorization s'il existe
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  try {
    // 2. Vérifier et décoder le token
    const decoded = jwt.verify(token, env.JWT_SECRET) as
      | {
          userId: number
          email: string
        }
      | undefined

    // 3. Ajouter les infos utilisateur à la requête pour l'utiliser dans les routes
    req.user = decoded
      ? {
          userId: decoded.userId,
          email: decoded.email,
        }
      : undefined

    // 4. vérifier si l'utilisateur est connecté, sinon on retourne 403
    if (!req.user) {
      return res.status(403).json({ error: 'Accès interdit' })
    }

    // 5. Passer au prochain middleware ou à la route
    return next()
  } catch (_error) {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}
