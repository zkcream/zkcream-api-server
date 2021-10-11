import axios from 'axios'
import * as ethers from 'ethers'
import Router from 'koa-router'
import Koa from 'koa'

import config from '../config'
import { IController } from './interface'
import { findHash, genProofAndPublicSignals } from './utils'

import S_Token from '../../abis/SignUpToken.json'
import V_Token from '../../abis/VotingToken.json'
import Cream from '../../abis/Cream.json'

import { jwtauth } from './auth'

const port = config.server.port

export enum TokenType {
  NULL = 0,
  VOTING = 1 << 0,
  SIGNUP = 1 << 1,
}

enum Status {
  UNAPPROVED = 0,
  APPROVED = 1 << 0,
}

interface TokenStatus {
  holdingToken: TokenType
  isApproved: Status
}

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
    return this.Router.use(jwtauth)
      .get('/deposit/logs/:address', this.getLogs.bind(this))
      .get('/:address', this.getDetails.bind(this))
      .get('/:address/:voter', this.getTokenStatus.bind(this))
      .get('/tally/:address/:recipient', this.getTallyResult.bind(this))
      .post('/genproof', this.genFormattedProof.bind(this))
      .post('/publish/:address', this.publish.bind(this))
      .post('/approve/:address', this.approve.bind(this))
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
    } catch (e: any) {
      if (e.message === `Cannot read property 'getLogs' of null`) {
        logs = []
        ctx.body = logs
      } else {
        console.log(e.messsage, e.stack)
        ctx.throw(e)
      }
    }
  }

  /*
     @return - object election details from ipfs hash
   */
  private getDetails = async (ctx: Koa.Context) => {
    const creamAddress = ctx.params.address

    // get the whole zkcream deployed logs
    const Authorization = ctx.headers.authorization

    const url = 'http://localhost:' + port + '/factory/logs'
    const r = await axios.get(url, { headers: { Authorization } })

    const ipfsHash = findHash(creamAddress, r.data)
    const url2 = 'http://localhost:' + port + '/ipfs/' + ipfsHash
    const r2 = await axios.get(url2, { headers: { Authorization } })

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
    r2.data.tallyHash = tallyHash !== '' ? tallyHash : undefined
    r2.data.maciAddress = maciAddress
    r2.data.signUpTokenAddress = signUpTokenAddress
    r2.data.votingTokenAddress = votingTokenAddress
    r2.data.owner = owner
    r2.data.coordinator = coordinator
    ctx.body = r2.data
  }

  /*
     @return - TokenStatus
   */
  private getTokenStatus = async (ctx: Koa.Context) => {
    const creamAddress = ctx.params.address
    const voter = ctx.params.voter

    let holdingToken: TokenType = TokenType.NULL
    let isApproved: Status = Status.UNAPPROVED

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

    const hasSignUpToken = parseInt(
      (await signUpTokenInstance.balanceOf(voter)).toString()
    )

    if (hasSignUpToken) {
      holdingToken = TokenType.SIGNUP
    } else {
      const hasVotingToken = parseInt(
        (await votingTokenInstance.balanceOf(voter)).toString()
      )
      if (hasVotingToken) {
        holdingToken = TokenType.VOTING
        isApproved = await votingTokenInstance.isApprovedForAll(
          voter,
          creamAddress
        )
      } else {
        holdingToken = TokenType.NULL
      }
    }

    const r: TokenStatus = {
      holdingToken,
      isApproved,
    }

    ctx.body = r
  }

  /*
    @return object formattedProof
     */
  private genFormattedProof = async (ctx: Koa.Context) => {
    const { input } = ctx.request.body
    const parsedInput = JSON.parse(input, (k, v) =>
      typeof v === 'string' && v.match(/^[0-9]+n$/) ? BigInt(v.slice(0, -1)) : v
    )

    const r = await genProofAndPublicSignals(
      parsedInput,
      'prod/vote.circom',
      'build/vote.zkey',
      'circuits/vote.wasm'
    )

    ctx.body = r
  }

  /*
   @return object transaction result
   */
  private publish = async (ctx: Koa.Context) => {
    const creamAddress = ctx.params.address
    const { hash, coordinator } = ctx.request.body

    const signer = this.provider.getSigner(coordinator)

    const creamInstance = new ethers.Contract(creamAddress, Cream.abi, signer)

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
      this.signer
    )
    const tx = await creamInstance.approveTally()
    const r = await tx.wait()
    ctx.body = r
  }

  /*
    @return number of token the recipient received
    */
  private getTallyResult = async (ctx: Koa.Context) => {
    const creamAddress = ctx.params.address
    const recipient = ctx.params.recipient

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

    const r = (await votingTokenInstance.balanceOf(recipient)).toString()

    ctx.body = r
  }
}

export default new CreamController().router()
