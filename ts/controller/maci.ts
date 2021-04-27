import * as ethers from 'ethers'
import Router from 'koa-router'
import Koa from 'koa'

import config from '../config'
import { IController } from './interface'
import { loadAbi } from './utils'

const creamAbi = loadAbi('Cream.abi')
const maciAbi = loadAbi('Maci.abi')

class MaciController implements IController {
    private Router = new Router({
        prefix: '/maci',
    })
    private provider: ethers.providers.JsonRpcProvider
    private signer: ethers.Wallet

    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(config.eth.url)
        this.signer = new ethers.Wallet(config.eth.adminKey, this.provider)
    }

    public router = (): Router => {
        return this.Router.post(
            '/publish/:address',
            this.publishMessage.bind(this)
        )
    }

    private publishMessage = async (ctx: Koa.Context) => {
        const creamAddress = ctx.params.address

        const creamInstance = new ethers.Contract(
            creamAddress,
            creamAbi,
            this.signer
        )

        const maciAddress = await creamInstance.maci()

        const { message, encPubKey, voter } = ctx.request.body

        const signer = this.provider.getSigner(voter)

        const maciInstance = new ethers.Contract(maciAddress, maciAbi, signer)

        const tx = await maciInstance.publishMessage(message, encPubKey)
        const r = await tx.wait()
        ctx.body = r
    }
}

export default new MaciController().router()
