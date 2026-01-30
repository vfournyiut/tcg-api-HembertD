import {Router} from 'express'
import getRouter from './get'
import postRouter from './post'
import patchRouter from './patch'
import deleteRouter from './delete'

export const deckRouter = Router()

deckRouter.use(getRouter)
deckRouter.use(postRouter)
deckRouter.use(patchRouter)
deckRouter.use(deleteRouter)

