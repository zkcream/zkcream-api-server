import * as ethers from 'ethers'
import Router from 'koa-router'
import Koa from 'koa'

import config from '../config'
import { IController } from './interface'
import { loadAbi } from './utils'

class FactoryController implements IController {
    private Router = new Router({
        prefix: '/zkcream',
    })
    private provider: ethers.providers.JsonRpcProvider
    private signer: ethers.Wallet
    public creamFactoryAddress: string
    public creamFactoryAbi: any
    public creamFactoryInstance: ethers.Contract

    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(config.eth.url)
        this.signer = new ethers.Wallet(config.eth.adminKey)
        this.creamFactoryAddress = config.eth.contracts.creamFactory
        this.creamFactoryAbi = loadAbi('../abis/CreamFactory.abi')
        this.creamFactoryInstance = new ethers.Contract(
            this.creamFactoryAddress,
            this.creamFactoryAbi,
            this.signer
        )
    }

    public router = (): Router => {
        return this.Router.get('/logs', this.getLogs.bind(this))
    }

    // return array of deployed cream contract addresses and ipfsHash
    // return empty array if there are no deployed contracts
    // TODO : this function might be ported to the graph node in the future ?
    private getLogs = async (ctx: Koa.Context) => {
        const eventName: ethers.EventFilter = { topics: ['CreamCreated'] }

        let logs: any[]

        try {
            logs = await this.creamFactoryInstance.queryFilter(eventName)
            ctx.body = logs.map((log) => {
                return log.args
            })
        } catch (e) {
            if (e.message === `Cannot read property 'getLogs' of null`) {
                logs = []
                ctx.body = logs
            } else {
                ctx.throw(e)
                console.log(e.messsage, e.stack)
            }
        }
    }
}

export default new FactoryController().router()
