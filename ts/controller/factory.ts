import * as ethers from 'ethers'
import Router from 'koa-router'
import Koa from 'koa'

import { IController } from './interface'

class FactoryController implements IController {
    private Router = new Router({
        prefix: '/factory',
    })
    private contract!: ethers.Contract

    constructor() {}

    public router = (): Router => {
        return this.Router.get('/elections', this.getElections.bind(this))
    }

    private getElections = async (ctx: Koa.Context) => {
        const eventName: ethers.EventFilter = { topics: ['CreamCreated'] }
        let logs: any[] = await this.contract.queryFilter(eventName)
        ctx.body = logs.map((log) => {
            return log.args
        })
    }
}

export default new FactoryController().router()
