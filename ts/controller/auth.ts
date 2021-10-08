import Koa from 'koa'

import passport from 'koa-passport'
import '../middlewares/passporthandler'

export class AuthController {
  public authenticate(ctx: Koa.Context, next: Koa.Next) {
    return passport.authenticate('jwt', function (err, user, info) {
      if (!user) {
        ctx.throw(401, 'unauthorized')
      } else {
        return next()
      }
    })
  }
}
