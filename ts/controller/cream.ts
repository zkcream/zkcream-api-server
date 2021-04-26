import axios from 'axios'
import * as ethers from 'ethers'
import Router from 'koa-router'
import Koa from 'koa'

import config from '../config'
import { IController } from './interface'
import { findHash, loadAbi } from './utils'

import S_Token from '../../abis/SignUpToken.json'
import V_Token from '../../abis/VotingToken.json'

const creamAbi = loadAbi('Cream.abi')

const port = config.server.port

class CreamController implements IController {
    private Router = new Router({
        prefix: '/zkcream',
    })
    private provider: ethers.providers.JsonRpcProvider
    private signer: ethers.Wallet

    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(config.eth.url)
        this.signer = new ethers.Wallet(config.eth.adminKey, this.provider)
    }

    public router = (): Router => {
        return this.Router.get(
            '/deposit/logs/:address',
            this.getLogs.bind(this)
        )
            .get('/:address', this.getDetails.bind(this))
            .get('/:address/:voter', this.hasToken.bind(this))
            .get('/faucet/:address/:voter', this.transferToken.bind(this))
            .post('/deposit/:address', this.deposit.bind(this))
            .post('/signup/:address', this.signup.bind(this))
    }

    private getLogs = async (ctx: Koa.Context) => {
        const contractAddress = ctx.params.address
        const creamInstance = new ethers.Contract(
            contractAddress,
            creamAbi,
            this.signer
        )
        const eventName: any = 'Deposit'
        let logs: any[]

        try {
            logs = await creamInstance.queryFilter(eventName)
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

    /*
     @return - object election details
   */
    private getDetails = async (ctx: Koa.Context) => {
        const contractAddress = ctx.params.address
        const url = 'http://localhost:' + port + '/factory/logs'
        const r = await axios.get(url)
        const ipfsHash = findHash(contractAddress, r.data)
        const url2 = 'http://localhost:' + port + '/ipfs/' + ipfsHash
        const r2 = await axios.get(url2)
        ctx.body = r2.data
    }

    /*
     @return - boolean transaction status
   */
    private transferToken = async (ctx: Koa.Context) => {
        const creamAddress = ctx.params.address
        const voter = ctx.params.voter
        const creamInstance = new ethers.Contract(
            creamAddress,
            creamAbi,
            this.signer
        )

        const votingTokenAddress = await creamInstance.votingToken()

        const votingTokenInstance = new ethers.Contract(
            votingTokenAddress,
            V_Token.abi,
            this.signer
        )

        const tx = await votingTokenInstance.giveToken(voter)
        const r = await tx.wait()

        ctx.body = r
    }

    /*
     @return - number[] number of tokens voter own
                        TODO: should return false if voter own > 1
   */
    private hasToken = async (ctx: Koa.Context) => {
        const creamAddress = ctx.params.address
        const voter = ctx.params.voter
        const arr: number[] = []

        const creamInstance = new ethers.Contract(
            creamAddress,
            creamAbi,
            this.provider
        )

        const votingTokenAddress = await creamInstance.votingToken()

        const votingTokenInstance = new ethers.Contract(
            votingTokenAddress,
            V_Token.abi,
            this.provider
        )

        const signUpTokenAddress = await creamInstance.signUpToken()

        const signUpTokenInstance = new ethers.Contract(
            signUpTokenAddress,
            S_Token.abi,
            this.provider
        )

        arr.push(
            parseInt((await votingTokenInstance.balanceOf(voter)).toString())
        )
        arr.push(
            parseInt((await signUpTokenInstance.balanceOf(voter)).toString())
        )

        ctx.body = arr
    }

    private deposit = async (ctx: Koa.Context) => {
        const creamAddress = ctx.params.address
        const { commitment, voter } = ctx.request.body

        const signer = this.provider.getSigner(voter)

        const creamInstance = new ethers.Contract(
            creamAddress,
            creamAbi,
            signer
        )

        const votingTokenAddress = await creamInstance.votingToken()

        // approval
        const votingTokenInstance = new ethers.Contract(
            votingTokenAddress,
            V_Token.abi,
            signer
        )

        await votingTokenInstance.setApprovalForAll(creamAddress, true)

        const tx = await creamInstance.deposit(commitment)
        const r = await tx.wait()
        ctx.body = r
    }

    private signup = async (ctx: Koa.Context) => {
        const creamAddress = ctx.params.address
        const {
            userPubKey,
            formattedProof,
            voter,
            root,
            nullifierHash,
        } = ctx.request.body

        const signer = this.provider.getSigner(voter)

        const creamInstance = new ethers.Contract(
            creamAddress,
            creamAbi,
            signer
        )

        const args = [root, nullifierHash]

        const tx = await creamInstance.signUpMaci(
            userPubKey,
            formattedProof,
            ...args
        )
        const r = await tx.wait()
        ctx.body = r
    }
}

export default new CreamController().router()
