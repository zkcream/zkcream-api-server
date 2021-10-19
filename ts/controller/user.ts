import Router from 'koa-router'
import Koa from 'koa'
import { IController } from './interface'

import * as jwt from 'jsonwebtoken'
import { User } from '../model/user'
import config from '../config'
import passport from 'koa-passport'
import '../middlewares/passport'
import { adminauth } from './auth'

class UserController implements IController {
  private Router = new Router({
    prefix: '/user',
  })

  public router = (): Router => {
    return this.Router.post('/register', adminauth, this.registerUser).post(
      '/login',
      this.authenticateUser
    )
  }

  public registerUser = async (ctx: Koa.Context): Promise<void> => {
    const user = await User.findOne({
      username: ctx.request.body.username,
    }).exec()
    if (user) {
      ctx.throw(401, 'user already exists')
    }

    await User.create({
      username: ctx.request.body.username,
      password: ctx.request.body.password,
      role: ctx.request.body.role,
    })

    const token = jwt.sign(
      {
        exp: Math.floor(Date.now() / 1000) + Number(config.auth.jwt.expiration),
        username: ctx.request.body.username,
      },
      config.auth.jwt.secretOrKey
    )

    ctx.status = 200
    ctx.body = { token: token }
  }

  public authenticateUser = (ctx: Koa.Context) => {
    return passport.authenticate('local', function (err, user) {
      if (!user) {
        ctx.throw(401, 'unauthorized!!')
      } else {
        const token = jwt.sign(
          {
            exp:
              Math.floor(Date.now() / 1000) +
              Number(config.auth.jwt.expiration),
            username: user.username,
          },
          config.auth.jwt.secretOrKey
        )
        ctx.body = { token: token }
        ctx.status = 200
      }
    })(ctx)
  }
}

export default new UserController().router()
