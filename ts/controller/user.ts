import Router from 'koa-router'
import Koa from 'koa'
import { IController } from './interface'

import * as jwt from 'jsonwebtoken'
import config from '../config'
import passport from 'koa-passport'
import '../middlewares/passport'
import { jwtauth } from './auth'

class UserController implements IController {
  private Router = new Router({
    prefix: '/user',
  })

  public router = (): Router => {
    return this.Router.post('/token', this.authenticateUser).get(
      '/verify',
      jwtauth,
      this.verify
    )
  }

  public authenticateUser = (ctx: Koa.Context) => {
    return passport.authenticate('local', function (err, user) {
      if (!user) {
        ctx.throw(401, 'unauthorized!!')
      } else {
        const token = jwt.sign(
          {
            username: ctx.request.body.address,
            exp:
              Math.floor(Date.now() / 1000) +
              Number(config.auth.jwt.expiration),
          },
          config.auth.jwt.secretOrKey
        )
        ctx.body = { token: token }
        ctx.cookies.set('jwt', token, {
          expires: new Date(
            Date.now() + (Number(config.auth.jwt.expiration) + 432000) * 1000
          ),
          httpOnly: true,
          secure: config.cookie.secure,
          sameSite: config.cookie.samesite,
        })
        ctx.status = 200
      }
    })(ctx)
  }

  public verify = (ctx: Koa.Context) => {
    ctx.status = 200
  }
}

export default new UserController().router()
