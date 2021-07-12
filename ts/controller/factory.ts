import * as ethers from 'ethers'
import Router from 'koa-router'
import Koa from 'koa'

import config from '../config'
import { IController } from './interface'
import { deployModules } from './utils'

import C_Verifier from '../../abis/CreamVerifier.json'
import S_Token from '../../abis/SignUpToken.json'
import V_Token from '../../abis/VotingToken.json'

const maciFactoryAddress = config.eth.contracts.maciFactory
import Cream from '../../abis/Cream.json'
import CreamFactory from '../../abis/CreamFactory.json'
import MACIFactory from '../../abis/MACIFactory.json'

const port = config.server.port

class FactoryController implements IController {
  private Router = new Router({
    prefix: '/factory',
  })
  private provider: ethers.providers.JsonRpcProvider
  private signer: ethers.Wallet
  public creamFactoryAddress: string
  public creamFactoryInstance: ethers.Contract
  public maciFactoryInstance: ethers.Contract
  public votingToken: ethers.ContractFactory
  public signUpToken: ethers.ContractFactory
  public creamVerifier: ethers.ContractFactory

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(config.eth.url)
    this.signer = new ethers.Wallet(config.eth.adminKey, this.provider)
    this.creamFactoryAddress = config.eth.contracts.creamFactory
    this.creamFactoryInstance = new ethers.Contract(
      this.creamFactoryAddress,
      CreamFactory.abi,
      this.signer
    )

    this.maciFactoryInstance = new ethers.Contract(
      maciFactoryAddress,
      MACIFactory.abi,
      this.signer
    )

    this.votingToken = new ethers.ContractFactory(
      V_Token.abi,
      V_Token.bytecode,
      this.signer
    )
    this.signUpToken = new ethers.ContractFactory(
      S_Token.abi,
      S_Token.bytecode,
      this.signer
    )
    this.creamVerifier = new ethers.ContractFactory(
      C_Verifier.abi,
      C_Verifier.bytecode,
      this.signer
    )
  }

  public router = (): Router => {
    return this.Router.get('/logs', this.getLogs.bind(this)).post(
      '/deploy',
      this.deployNewZkCream.bind(this)
    )
  }

  /*
       @return - string[] array of deployed cream contract addresses and ipfsHash
                          return empty array if there are no deployed contracts
       TODO: this function might be ported to the graph node in the future ?
     */
  private getLogs = async (ctx: Koa.Context) => {
    const eventName: any = 'CreamCreated'
    let logs: any[]

    try {
      logs = await this.creamFactoryInstance.queryFilter(eventName)
      ctx.body = logs.map((log) => {
        return [log.args['creamAddress'], log.args['ipfsHash']]
      })
    } catch (e) {
      if (e.message === `Cannot read property 'getLogs' of null`) {
        ctx.body = {
          message: e.message,
        }
      } else {
        ctx.throw(e)
        console.log(e.messsage, e.stack)
      }
    }
  }

  /*
     @return - transaction details
   */
  private deployNewZkCream = async (ctx: Koa.Context) => {
    // Check if MACIFactory is owned by CreamFactory contract
    if ((await this.maciFactoryInstance.owner()) != this.creamFactoryAddress) {
      await this.maciFactoryInstance.transferOwnership(this.creamFactoryAddress)
    }

    // Deploy votingToken, signUpToken and creamVerifier
    const {
      votingTokenInstance,
      signUpTokenInstance,
      creamVerifierInstance,
    } = await deployModules(
      this.votingToken,
      this.signUpToken,
      this.creamVerifier
    )

    const {
      initial_voice_credit_balance,
      merkle_tree_height,
      coordinator_pubkey,
      coordinator_address,
      ipfsHash,
      recipients,
    } = ctx.request.body

    const tx = await this.creamFactoryInstance.createCream(
      creamVerifierInstance.address,
      votingTokenInstance.address,
      signUpTokenInstance.address,
      initial_voice_credit_balance,
      merkle_tree_height,
      recipients,
      ipfsHash,
      coordinator_pubkey,
      coordinator_address
    )

    const r = await tx.wait()

    // transfer SignUpToken contract ownership
    const newCreamAddress = r.events[r.events.length - 1].args[0]
    const tx2 = await signUpTokenInstance.transferOwnership(newCreamAddress)
    const r2 = await tx2.wait()
    console.assert(r2.status)

    ctx.body = r
  }
}

export default new FactoryController().router()
