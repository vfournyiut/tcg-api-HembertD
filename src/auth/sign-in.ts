import {Request, Response, Router} from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {prisma} from "../database";
import {env} from "../env";

export const authRouter = Router()

// POST api/auth/sign-in
authRouter.post('/', async (req: Request, res: Response) => {
    const {email, password} = req.body

    try {
        // 1. Validation des données fournies
        if (!email || !password) {
            return res.status(400).json({error: 'Email et password sont requis'})
        }
        // 2. Se connecter avec un compte existant
        const user = await prisma.user.findUnique({
            where: {email},
        })
        if (!user) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }
        // 3. Vérifier le mot de passe
        const passwordMatch = await bcrypt.compare(password, user.password)
        if (!passwordMatch) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // 4. Générer un token JWT
        const token = jwt.sign(
            {userId: user.id, email: user.email},
            env.JWT_SECRET,
            {expiresIn: '24h'},
        )
        return res.status(200).json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})
