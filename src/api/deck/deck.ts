import {Router} from 'express'

import deleteRouter from './delete'
import getRouter from './get'
import patchRouter from './patch'
import postRouter from './post'

export const deckRouter = Router()

deckRouter.use(getRouter)
deckRouter.use(postRouter)
deckRouter.use(patchRouter)
deckRouter.use(deleteRouter)

