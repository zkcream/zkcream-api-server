import Koa, { Middleware } from 'koa'
import cors from '@koa/cors'

import CreamController from './controller/cream'
import EchoController from './controller/echo'
import FactoryController from './controller/factory'
import IpfsController from './controller/ipfs'
import MaciController from './controller/maci'
import { middlewares } from './middlewares'

class App {
  public app: Koa
  private handlers: object = {}

  constructor() {
    this.app = new Koa()
    this.app.use(cors())
    this.middlewares()
    this.routes()
  }

  private middlewares = () => {
    middlewares.forEach((middleware) =>
      this.app.use(this.requireMiddleware(middleware))
    )
  }

  private requireMiddleware = (path): Middleware => {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL) {
      console.log(`-> setup ${path}`)
      this.app.use(async (next) => {
        await next
        console.log(`<- setup ${path}`, new Date())
      })
    }

    const handler = require(`./middlewares/${path}`)

    if (handler.init) {
      handler.init(this.app)
    }

    return (this.handlers[path] = handler)
  }

  private routes = () => {
    this.app.use(CreamController.routes())
    this.app.use(EchoController.routes())
    this.app.use(FactoryController.routes())
    this.app.use(MaciController.routes())
    this.app.use(IpfsController.routes())
  }
}

export default new App().app
