import dotenv from 'dotenv'

dotenv.config()

/**
 * Configuration des variables d'environnement
 * Charge et expose les variables d'environnement nécessaires au fonctionnement de l'application
 */
export const env = {
  /** Port du serveur */
  PORT: process.env.PORT || 3001,
  /** Clé secrète pour les tokens JWT */
  JWT_SECRET: (process.env.JWT_SECRET || 'default-secret') as string,
  /** URL de connexion à la base de données */
  DATABASE_URL: (process.env.DATABASE_URL || 'file:./dev.db') as string,
  /** Environnement (development/production) */
  NODE_ENV: (process.env.NODE_ENV || 'development') as string,
}
