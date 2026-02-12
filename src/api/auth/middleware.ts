import {NextFunction, Request, Response} from 'express'
import jwt from 'jsonwebtoken'
import {env} from "../../env";

// Étendre le type Request pour ajouter userId
declare global {
    namespace Express {
        interface Request {
            user: {
                email: string
                userId: number
            } | undefined
        }
    }
}

export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    // 1. Récupérer le token depuis l'en-tête Authorization s'il existe
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({error: 'Token manquant'})
    }


    try {
        // 2. Vérifier et décoder le token
        const decoded = jwt.verify(token, env.JWT_SECRET) as {
            userId: number
            email: string
        } | undefined

        // 3. Ajouter les infos utilisateur à la requête pour l'utiliser dans les routes
        req.user = decoded ? {
            userId: decoded.userId,
            email: decoded.email
        } : undefined

        // 4. vérifier si l'utilisateur est connecté, sinon on retourne 403
        if (!req.user) {
            return res.status(403).json({error: 'Accès interdit'})
        }

        // 5. Passer au prochain middleware ou à la route
        return next()
    } catch (error) {
        return res.status(401).json({error: 'Token invalide ou expiré'})
    }
}
