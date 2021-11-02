import Koa from 'koa'

export = async (ctx: Koa.Context, next) => {
  await next().catch((e) => {
    if (e.status) {
      ctx.status = e.status
      ctx.body = {
        message: e.message,
      }
    } else {
      console.log(e)
      ctx.status = 500
      ctx.body = {
        message: 'Internal Server Error',
      }
    }
  })
}
