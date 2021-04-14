import Router from 'koa-router'
import Koa from 'koa'

interface IController {
    router(): Router
}

class VoteController implements IController {
    private Router = new Router({
        prefix: '/vote',
    })

    constructor() {}

    public router(): Router {
        return this.Router.get('/', this.echo.bind(this))
    }

    private async echo(ctx: Koa.Context) {
        ctx.body = 'hello\n'
    }
}

export default new VoteController().router()
