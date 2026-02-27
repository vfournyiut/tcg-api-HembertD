import bcrypt from 'bcryptjs'
import { Request, Response, Router } from 'express'
import jwt from 'jsonwebtoken'

import { prisma } from '../../database'
import { env } from '../../env'

export const authRouter = Router()

/**
 * Route d'inscription avec email, username et password
 * Crée un nouveau compte utilisateur avec validation des données
 * 
 * @route POST /
 * @description Crée un nouveau compte utilisateur avec validation des données
 * @param {string} req.body.email - Email de l'utilisateur (requis)
 * @param {string} req.body.username - Nom d'utilisateur (requis)
 * @param {string} req.body.password - Mot de passe (requis, min 6 caractères)
 * @returns {201} {message, token, user} en cas de succès
 * @returns {400} Données manquantes
 * @returns {400} Format d'email invalide
 * @returns {400} Mot de passe < 6 caractères
 * @returns {409} Email déjà utilisé
 * @returns {409} Username déjà utilisé
 * @returns {500} Erreur serveur interne
 * @throws {400} Email, username et password sont requis
 * @throws {400} Format d'email invalide
 * @throws {400} Le mot de passe doit contenir au moins 6 caractères
 * @throws {409} Cet email est déjà utilisé
 * @throws {409} Ce nom d'utilisateur est déjà utilisé
 * @throws {500} Erreur serveur interne
 */
authRouter.post('/', async (req: Request, res: Response) => {
  const { email, username, password } = req.body

  // 1. Validation des données obligatoires
  if (!email || !username || !password) {
    return res
      .status(400)
      .json({ error: 'Email, username et password sont requis' })
  }

  // 2. Validation du format de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Format d'email invalide" })
  }

  // 3. Validation de la longueur du mot de passe
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: 'Le mot de passe doit contenir au moins 6 caractères' })
  }

  try {
    // 4. Vérifier si l'email est déjà utilisé
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' })
    }

    // 5. Vérifier si le username est déjà utilisé
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUsername) {
      return res
        .status(409)
        .json({ error: "Ce nom d'utilisateur est déjà utilisé" })
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
      { expiresIn: '7d' }, // Le token expire dans 7 jours
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
    console.error("Erreur lors de l'inscription:", error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})
