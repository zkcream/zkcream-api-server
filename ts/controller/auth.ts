import Koa from 'koa'

import passport from 'koa-passport'
import '../middlewares/passport'
import { redisClient } from '../db/redis'
import config from '../config'

export const jwtauth = async (ctx: Koa.Context, next: Koa.Next) => {
  await passport.authenticate('jwt', function (err, user) {
    if (!user) {
      ctx.throw(401, 'unauthorized')
    } else {
      return next()
    }
  })(ctx, next)
}

export const limitIp = async (ctx: Koa.Context, next: Koa.Next) => {
  const clientIp = ctx.request.ip
  const address = ctx.request.body.to
  const key = `${clientIp}::${address.toLocaleLowerCase()}`
  const exists = await redisClient.get(key)
  if (exists) {
    ctx.throw(401, 'unable to request within 24 hours')
  } else {
    redisClient.set(key, 'true', 'EX', config.faucet.expiration)
  }
  return next()
}
