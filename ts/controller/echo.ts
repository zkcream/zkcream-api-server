import Router from 'koa-router'
import Koa from 'koa'

import { IController } from './interface'
import { AuthController } from './auth'

class EchoController implements IController {
  private Router = new Router()
  private authController: AuthController = new AuthController()

  constructor() {}

  public router = (): Router => {
    return this.Router.get(
      '/:msg',
      this.authController.authenticate,
      this.echo.bind(this)
    )
  }

  private echo = async (ctx: Koa.Context) => {
    ctx.body = ctx.params
  }
}

export default new EchoController().router()
