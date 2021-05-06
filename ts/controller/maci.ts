import * as ethers from 'ethers'
import Router from 'koa-router'
import Koa from 'koa'

import config from '../config'
import { IController } from './interface'
import { loadAbi, genRandomStateLeaf } from './utils'

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
            .get('/address/:address', this.getAddress.bind(this))
            .get('/params/:address', this.getParamsForMaciState.bind(this))
            .post('/process/:address', this.generateProofs.bind(this))
    }

    private getAddress = async (ctx: Koa.Context) => {
        const creamAddress = ctx.params.address

        const creamInstance = new ethers.Contract(
            creamAddress,
            creamAbi,
            this.signer
        )

        const r = await creamInstance.maci()

        ctx.body = r
    }

    private publishMessage = async (ctx: Koa.Context) => {
        const maciAddress = ctx.params.address

        const { message, encPubKey, voter } = ctx.request.body

        const signer = this.provider.getSigner(voter)

        const maciInstance = new ethers.Contract(maciAddress, maciAbi, signer)

        const tx = await maciInstance.publishMessage(message, encPubKey)
        const r = await tx.wait()
        ctx.body = r
    }

    private getParamsForMaciState = async (ctx: Koa.Context) => {
        const maciAddress = ctx.params.address

        const maciInstance = new ethers.Contract(
            maciAddress,
            maciAbi,
            this.signer
        )

        const treeDepths = await maciInstance.treeDepths()
        const stateTreeDepth = treeDepths[0].toString()
        const messageTreeDepth = treeDepths[1].toString()
        const voteOptionTreeDepth = treeDepths[2].toString()
        const maxVoteOptionIndex = (
            await maciInstance.voteOptionsMaxLeafIndex()
        ).toString()

        const signUpLogs = await this.provider.getLogs({
            ...maciInstance.filters.SignUp(),
            fromBlock: 0,
        })

        const publishMessageLogs = await this.provider.getLogs({
            ...maciInstance.filters.PublishMessage(),
            fromBlock: 0,
        })

        const data = {
            stateTreeDepth,
            messageTreeDepth,
            voteOptionTreeDepth,
            maxVoteOptionIndex,
            signUpLogs,
            publishMessageLogs,
        }

        ctx.body = data
    }

    private generateProofs = async (ctx: Koa.Context) => {
        const maciAddress = ctx.params.address

        const { coordinator } = ctx.request.body

        const signer = this.provider.getSigner(coordinator)

        const maciInstance = new ethers.Contract(maciAddress, maciAbi, signer)

        // TODO
        const maciState = ''
        const randomStateLeaf = await genRandomStateLeaf(
            maciState,
            maciInstance
        )
        const tally = 'foo'
        ctx.body = tally
    }
}

export default new MaciController().router()
