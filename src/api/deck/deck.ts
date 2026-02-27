import { Router } from 'express'

import deleteRouter from './delete'
import getRouter from './get'
import patchRouter from './patch'
import postRouter from './post'

/**
 * Router principal pour les routes des decks
 * Combine les routes GET, POST, PATCH et DELETE pour la gestion des decks
 */
export const deckRouter = Router()

deckRouter.use(getRouter)
deckRouter.use(postRouter)
deckRouter.use(patchRouter)
deckRouter.use(deleteRouter)
