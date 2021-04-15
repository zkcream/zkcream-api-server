import Router from 'koa-router'
import Koa from 'koa'

import { IController } from './interface'

class EchoController implements IController {
    private Router = new Router()

    constructor() {}

    public router = (): Router => {
        return this.Router.get('/:msg', this.echo.bind(this))
    }

    private echo = async (ctx: Koa.Context) => {
        ctx.body = ctx.params
    }
}

export default new EchoController().router()
