import Koa from 'koa'

import VoteController from './controller/vote'

class App {
    public app: Koa

    constructor() {
        this.app = new Koa()
        this.routes()
    }

    private routes() {
        this.app.use(VoteController.routes())
    }
}

export default new App().app
