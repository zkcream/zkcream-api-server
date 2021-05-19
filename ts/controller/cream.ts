import axios from 'axios'
import * as ethers from 'ethers'
import Router from 'koa-router'
import Koa from 'koa'

import config from '../config'
import { IController } from './interface'
import { findHash } from './utils'

import S_Token from '../../abis/SignUpToken.json'
import V_Token from '../../abis/VotingToken.json'
import Cream from '../../abis/Cream.json'

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
            .post('/faucet/:address', this.transferToken.bind(this))
            .post('/deposit/:address', this.deposit.bind(this))
            .post('/signup/:address', this.signup.bind(this))
            .post('/publish/:address', this.publish.bind(this))
            .post('/approve/:address', this.approve.bind(this))
            .post('/withdraw/:address', this.withdraw.bind(this))
    }

    private getLogs = async (ctx: Koa.Context) => {
        const contractAddress = ctx.params.address
        const creamInstance = new ethers.Contract(
            contractAddress,
            Cream.abi,
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
     @return - object election details from ipfs hash
   */
    private getDetails = async (ctx: Koa.Context) => {
        const creamAddress = ctx.params.address

        // get the whole zkcream deployed logs
        const url = 'http://localhost:' + port + '/factory/logs'
        const r = await axios.get(url)

        const ipfsHash = findHash(creamAddress, r.data)
        const url2 = 'http://localhost:' + port + '/ipfs/' + ipfsHash
        const r2 = await axios.get(url2)

        const creamInstance = new ethers.Contract(
            creamAddress,
            Cream.abi,
            this.signer
        )

        const approved = await creamInstance.approved()
        const tallyHash = await creamInstance.tallyHash()
        const maciAddress = await creamInstance.maci()
        const signUpTokenAddress = await creamInstance.signUpToken()
        const votingTokenAddress = await creamInstance.votingToken()
        const owner = await creamInstance.owner()
        const coordinator = await creamInstance.coordinator()

        r2.data.approved = approved
        r2.data.tallyHash = tallyHash
        r2.data.maciAddress = maciAddress
        r2.data.signUpTokenAddress = signUpTokenAddress
        r2.data.votingTokenAddress = votingTokenAddress
        r2.data.owner = owner
        r2.data.coordinator = coordinator
        ctx.body = r2.data
    }

    /*
     @return - boolean transaction status
   */
    private transferToken = async (ctx: Koa.Context) => {
        const creamAddress = ctx.params.address
        const { voter } = ctx.request.body
        const creamInstance = new ethers.Contract(
            creamAddress,
            Cream.abi,
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
            Cream.abi,
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

    /*
     @return - object transaction result with event args
   */
    private deposit = async (ctx: Koa.Context) => {
        const creamAddress = ctx.params.address
        const { commitment, voter } = ctx.request.body

        const signer = this.provider.getSigner(voter)

        const creamInstance = new ethers.Contract(
            creamAddress,
            Cream.abi,
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

    /*
     @return - object transaction result
   */
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
            Cream.abi,
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

    /*
   @return object transaction result
   */
    private publish = async (ctx: Koa.Context) => {
        const creamAddress = ctx.params.address
        const { hash, coordinator } = ctx.request.body

        const signer = this.provider.getSigner(coordinator)

        const creamInstance = new ethers.Contract(
            creamAddress,
            Cream.abi,
            signer
        )

        const tx = await creamInstance.publishTallyHash(hash)
        const r = await tx.wait()
        ctx.body = r
    }

    /*
  @return object transaction result
   */
    private approve = async (ctx: Koa.Context) => {
        const creamAddress = ctx.params.address
        const { owner } = ctx.request.body
        const signer = this.provider.getSigner(owner)
        const creamInstance = new ethers.Contract(
            creamAddress,
            Cream.abi,
            signer
        )
        const tx = await creamInstance.approveTally()
        const r = await tx.wait()
        ctx.body = r
    }

    /*
  @return object transaction result
   */
    private withdraw = async (ctx: Koa.Context) => {
        const creamAddress = ctx.params.address
        const { coordinator } = ctx.request.body

        const signer = this.provider.getSigner(coordinator)

        const creamInstance = new ethers.Contract(
            creamAddress,
            Cream.abi,
            signer
        )

        const hash = await creamInstance.tallyHash()
        const recipients = await creamInstance.getRecipients()

        const url = 'http://localhost:' + port + '/ipfs/' + hash
        const r_tally = await axios.get(url)
        const resultsArr = r_tally.data.results.tally

        const r: any[] = []
        for (let i = 0; i < recipients.length; i++) {
            const count = resultsArr[i]
            for (let j = 0; j < count; j++) {
                const tx = await creamInstance.withdraw(i)
                if (tx) {
                    r.push(await tx.wait())
                }
            }
        }

        ctx.body = r
    }
}

export default new CreamController().router()
