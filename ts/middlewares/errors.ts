import Koa from 'koa'

export = async (ctx: Koa.Context, next) => {
    try {
        await next()
    } catch (e) {
        ctx.throw(e)
        console.log(e.message, e.stack)
    }
}
