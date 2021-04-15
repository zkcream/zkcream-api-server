import * as ethers from 'ethers'
import Koa, { Middleware } from 'koa'

import EchoController from './controller/echo'
import FactoryController from './controller/factory'
import { middlewares } from './middlewares'

class App {
    public app: Koa
    private handlers: object = {}

    constructor() {
        this.app = new Koa()
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
        this.app.use(FactoryController.routes())
        this.app.use(EchoController.routes())
    }
}

export default new App().app
