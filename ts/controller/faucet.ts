import axios from 'axios'
import Router from 'koa-router'
import Koa from 'koa'

import config from '../config'
import { IController } from './interface'
import { jwtauth } from './auth'

class FaucetController implements IController {
  private Router = new Router({
    prefix: '/faucet',
  })

  constructor() {}

  public router = (): Router => {
    return this.Router.use(jwtauth).post('/', this.getEth)
  }

  private getEth = async (ctx: Koa.Context) => {
    const transactionId = Math.floor(Math.random() * 1000000000) + 1
    const { to } = ctx.request.body
    if (config.eth.faucet.password.length > 0) {
      const response = await axios.post(config.eth.url, {
        jsonrpc: '2.0',
        id: transactionId,
        method: 'personal_unlockAccount',
        params: [config.eth.faucet.address, config.eth.faucet.password, 10],
      })
      console.log(response.data)
    }
    const r = await axios.post(config.eth.url, {
      jsonrpc: '2.0',
      id: transactionId,
      method: 'eth_sendTransaction',
      params: [
        {
          from: config.eth.faucet.address,
          to,
          value: config.eth.faucet.value,
        },
      ],
    })
    ctx.body = r.data.result
  }
}

export default new FaucetController().router()
