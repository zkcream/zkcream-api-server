import * as ethers from 'ethers'
import Router from 'koa-router'
import Koa from 'koa'

import config from '../config'
import { IController } from './interface'
import { getMaciLogs } from './utils'

import Cream from '../../abis/Cream.json'
import MACI from '../../abis/MACI.json'

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
    return this.Router.get(
      '/params/:address',
      this.getParamsForMaciState.bind(this)
    )
  }

  private getParamsForMaciState = async (ctx: Koa.Context) => {
    const maciAddress = ctx.params.address

    const maciInstance = new ethers.Contract(maciAddress, MACI.abi, this.signer)

    const treeDepths = await maciInstance.treeDepths()
    const stateTreeDepth = treeDepths[0]
    const messageTreeDepth = treeDepths[1]
    const voteOptionTreeDepth = treeDepths[2]
    const maxVoteOptionIndex = parseInt(
      await maciInstance.voteOptionsMaxLeafIndex()
    )
    const coordinatorPubKey = await maciInstance.coordinatorPubKey()
    const signUpLogs = await getMaciLogs(maciInstance, 'SignUp')
    const publishMessageLogs = await getMaciLogs(maciInstance, 'PublishMessage')
    const signUpTimestamp = await maciInstance.signUpTimestamp()
    const signUpDurationSeconds = await maciInstance.signUpDurationSeconds()
    const votingDurationSeconds = await maciInstance.votingDurationSeconds()

    const data = {
      stateTreeDepth,
      messageTreeDepth,
      voteOptionTreeDepth,
      maxVoteOptionIndex,
      coordinatorPubKey,
      signUpLogs,
      publishMessageLogs,
      signUpTimestamp,
      signUpDurationSeconds,
      votingDurationSeconds,
    }

    ctx.body = data
  }
}

export default new MaciController().router()
