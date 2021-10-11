import Koa from 'koa'

import passport from 'koa-passport'
import '../middlewares/passport'

class AuthController {
  public async authenticate(ctx: Koa.Context, next: Koa.Next) {
    await passport.authenticate('jwt', function (err, user) {
      if (!user) {
        ctx.throw(401, 'unauthorized')
      } else {
        return next()
      }
    })(ctx, next)
  }
}

export const jwtauth = new AuthController().authenticate
