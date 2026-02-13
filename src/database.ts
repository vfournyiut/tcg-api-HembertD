import { PrismaPg } from '@prisma/adapter-pg'

import { env } from './env'
import { PrismaClient } from './generated/prisma/client'

/**
 * Client Prisma configuré avec l'adaptateur PostgreSQL
 * Instance PrismaClient pour les opérations base de données
 * 
 * @returns {PrismaClient} Instance PrismaClient prête à être utilisée pour les requêtes
 * @throws Erreur de connexion si DATABASE_URL invalide
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
