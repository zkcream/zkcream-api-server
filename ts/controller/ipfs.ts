import Router from 'koa-router'
import Koa from 'koa'

import config from '../config'
import { IController } from './interface'

const ipfsClient = require('ipfs-http-client')

class IpfsController implements IController {
    private Router = new Router({
        prefix: '/ipfs',
    })
    private ipfs = ipfsClient(config.ipfs.url)

    constructor() {}

    public router = (): Router => {
        return this.Router.post('/', this.getHash.bind(this)).get(
            '/:hash',
            this.getDataFromHash.bind(this)
        )
    }

    private getHash = async (ctx: Koa.Context) => {
        ctx.body = await this.ipfs.add(JSON.stringify(ctx.request.body))
    }

    private getDataFromHash = async (ctx: Koa.Context) => {
        const stream = this.ipfs.cat(ctx.params.hash)
        let data = ''
        for await (const chunk of stream) {
            data += chunk.toString()
        }
        ctx.body = data
    }
}

export default new IpfsController().router()
