import * as ethers from 'ethers'
import Koa from 'koa'

import FactoryController from './controller/factory'
import EchoController from './controller/echo'

class App {
    public app: Koa

    constructor() {
        this.app = new Koa()
        this.routes()
    }

    private routes() {
        this.app.use(FactoryController.routes())
        this.app.use(EchoController.routes())
    }
}

export default new App().app
