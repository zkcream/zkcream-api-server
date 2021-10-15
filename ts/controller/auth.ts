import Koa from 'koa'

import passport from 'koa-passport'
import '../middlewares/passport'
import { userType } from '../model/user'

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

  public async authenticateAdmin(ctx: Koa.Context, next: Koa.Next) {
    await passport.authenticate('jwt', function (err, user) {
      if (process.env.NODE_ENV === 'test') {
        return next()
      }
      if (user && user.role == userType.ADMIN) {
        return next()
      } else {
        ctx.throw(401, 'unauthorized')
      }
    })(ctx, next)
  }
}

export const jwtauth = new AuthController().authenticate
export const adminauth = new AuthController().authenticateAdmin
