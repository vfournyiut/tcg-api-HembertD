import {Request, Response, Router} from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {prisma} from "../../database";
import {env} from "../../env";

export const authRouter = Router()

// POST /api/auth/sign-up (router mounted at /api/auth/sign-up)
authRouter.post('/', async (req: Request, res: Response) => {
    const {email, username, password} = req.body

    // 1. Validation des données obligatoires
    if (!email || !username || !password) {
        return res.status(400).json({error: 'Email, username et password sont requis'})
    }

    // 2. Validation du format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return res.status(400).json({error: 'Format d\'email invalide'})
    }

    // 3. Validation de la longueur du mot de passe
    if (password.length < 6) {
        return res.status(400).json({error: 'Le mot de passe doit contenir au moins 6 caractères'})
    }

    try {
        // 4. Vérifier si l'email est déjà utilisé
        const existingUser = await prisma.user.findUnique({
            where: {email},
        })

        if (existingUser) {
            return res.status(409).json({error: 'Cet email est déjà utilisé'})
        }

        // 5. Vérifier si le username est déjà utilisé
        const existingUsername = await prisma.user.findUnique({
            where: {username},
        })

        if (existingUsername) {
            return res.status(409).json({error: 'Ce nom d\'utilisateur est déjà utilisé'})
        }

        // 6. Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10)

        // 7. Créer l'utilisateur
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
            },
        })

        // 8. Générer le JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            env.JWT_SECRET,
            {expiresIn: '7d'}, // Le token expire dans 7 jours
        )

        // 9. Retourner le token
        return res.status(201).json({
            message: 'Inscription réussie',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})
