import cors from "cors";
import express from "express";
import {createServer} from "http";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import swaggerUi from "swagger-ui-express";

import { authRouter as signInRouter } from './api/auth/sign-in'
import { authRouter as signUpRouter } from './api/auth/sign-up'
import { cardRouter } from './api/cards/card'
import { deckRouter } from './api/deck/deck'
import { env } from './env'

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

// Swagger documentation setup
function loadSwaggerDocs() {
  try {
    // Charger la configuration principale
    const configPath = path.join(__dirname, '..', 'docs', 'swagger.config.yml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent) as Record<string, unknown>;

    // Charger les documentations par module
    const docsDir = path.join(__dirname, '..', 'docs');
    
    // Charger auth.doc.yml
    const authDocPath = path.join(docsDir, 'auth.doc.yml');
    const authDocContent = fs.readFileSync(authDocPath, 'utf8');
    const authDoc = yaml.load(authDocContent) as Record<string, unknown>;

    // Charger card.doc.yml
    const cardDocPath = path.join(docsDir, 'card.doc.yml');
    const cardDocContent = fs.readFileSync(cardDocPath, 'utf8');
    const cardDoc = yaml.load(cardDocContent) as Record<string, unknown>;

    // Charger deck.doc.yml
    const deckDocPath = path.join(docsDir, 'deck.doc.yml');
    const deckDocContent = fs.readFileSync(deckDocPath, 'utf8');
    const deckDoc = yaml.load(deckDocContent) as Record<string, unknown>;

    // Fusionner les paths
    const mergedPaths: Record<string, unknown> = {};
    
    // Ajouter les paths de auth.doc.yml
    if (authDoc.paths) {
      Object.assign(mergedPaths, authDoc.paths);
    }
    
    // Ajouter les paths de card.doc.yml
    if (cardDoc.paths) {
      Object.assign(mergedPaths, cardDoc.paths);
    }
    
    // Ajouter les paths de deck.doc.yml
    if (deckDoc.paths) {
      Object.assign(mergedPaths, deckDoc.paths);
    }

    // Fusionner dans la configuration principale
    config.paths = mergedPaths;

    // Ajouter les composants (schemas, responses) depuis les fichiers de doc
    if (authDoc.components) {
      if (!config.components) {
        (config as Record<string, unknown>).components = {};
      }
      const mainComponents = config.components as Record<string, unknown>;
      const authComponents = authDoc.components as Record<string, unknown>;
      
      // Fusionner les schemas
      if (authComponents.schemas) {
        if (!mainComponents.schemas) {
          mainComponents.schemas = {};
        }
        Object.assign(mainComponents.schemas as Record<string, unknown>, authComponents.schemas);
      }
      
      // Fusionner les responses
      if (authComponents.responses) {
        if (!mainComponents.responses) {
          mainComponents.responses = {};
        }
        Object.assign(mainComponents.responses as Record<string, unknown>, authComponents.responses);
      }
    }

    // Ajouter les paramètres depuis card.doc.yml
    if (cardDoc.components) {
      const cardComponents = cardDoc.components as Record<string, unknown>;
      if (cardComponents.parameters && config.components) {
        const mainComponents = config.components as Record<string, unknown>;
        if (!mainComponents.parameters) {
          mainComponents.parameters = {};
        }
        Object.assign(mainComponents.parameters as Record<string, unknown>, cardComponents.parameters);
      }
    }

    return config;
  } catch (error) {
    console.error('Erreur lors du chargement de la documentation Swagger:', error);
    return null;
  }
}

// Activer CORS pour les requêtes API (y compris depuis Swagger UI)
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Charger et configurer Swagger
const swaggerDocs = loadSwaggerDocs();
if (swaggerDocs) {
  // Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocs, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .auth-wrapper { justify-content: flex-end }
      `,
      customSiteTitle: 'TCG API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
      },
    })
  );

  // Route JSON pour la spécification OpenAPI
  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerDocs);
  });

  console.log(`📚 Swagger UI disponible sur http://localhost:${env.PORT}/api-docs`);
}

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

