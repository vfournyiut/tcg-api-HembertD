import cors from "cors";
import express from "express";
import {createServer} from "http";

import {authRouter as signInRouter} from "./api/auth/sign-in";
import {authRouter as signUpRouter} from "./api/auth/sign-up";
import {cardRouter} from "./api/cards/card";
import {deckRouter} from "./api/deck/deck";
import {env} from "./env";

// Create Express app
/**
 * Application Express principale configurée avec les middlewares et routes
 * Point d'entrée de l'API TCG (Trading Card Game)
 */
export const app = express()

// Middlewares
app.use(
  cors({
    origin: true, // Autorise toutes les origines
    credentials: true,
  }),
)

app.use(express.json())

// Serve static files (Socket.io test client)
app.use(express.static('public'))

// Health check endpoint
/**
 * Endpoint de vérification de santé du serveur
 * 
 * @route GET /api/health
 * @description Retourne le statut du serveur
 * @returns {200} {status, message} - Serveur opérationnel
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'TCG Backend Server is running' })
})

/**
 * Route d'inscription utilisateur
 * @see {@link ./api/auth/sign-up}
 */
app.use('/api/auth/sign-up', signUpRouter)

/**
 * Route de connexion utilisateur
 * @see {@link ./api/auth/sign-in}
 */
app.use('/api/auth/sign-in', signInRouter)

/**
 * Routes des cartes
 * @see {@link ./api/cards/card}
 */
app.use('/api/cards', cardRouter)

/**
 * Routes des decks (CRUD)
 * @see {@link ./api/deck/deck}
 */
app.use('/api/decks', deckRouter)

// Start server only if this file is run directly (not imported for tests)
if (require.main === module) {
  // Create HTTP server
  const httpServer = createServer(app)

  // Start server
  try {
    httpServer.listen(env.PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`)
      console.log(
        `🧪 Socket.io Test Client available at http://localhost:${env.PORT}`,
      )
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}
