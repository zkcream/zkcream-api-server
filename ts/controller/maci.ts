import * as ethers from 'ethers'
import Router from 'koa-router'
import Koa from 'koa'

import config from '../config'
import { IController } from './interface'
import { formatProofForVerifierContract, getMaciLogs } from './utils'

import Cream from '../../abis/Cream.json'
import MACI from '../../abis/MACI.json'

import {
  genBatchUstProofAndPublicSignals,
  verifyBatchUstProof,
  getSignalByName,
} from 'maci-circuits'

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
    ).post('/genproof', this.genProof.bind(this))
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
    const signUpLogs = await getMaciLogs(this.provider, maciInstance, 'SignUp')
    const publishMessageLogs = await getMaciLogs(
      this.provider,
      maciInstance,
      'PublishMessage'
    )
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

  /*
   @return formattedProof
   */
  private genProof = async (ctx: Koa.Context) => {
    const { circuitInputs, configType, stateRootAfter } = ctx.request.body
    const {
      circuit,
      witness,
      proof,
      publicSignals,
    } = await genBatchUstProofAndPublicSignals(
      JSON.parse(circuitInputs),
      configType
    )

    // Get the circuit-generated root
    const circuitNewStateRoot = getSignalByName(circuit, witness, 'main.root')
    if (!circuitNewStateRoot.toString() === stateRootAfter) {
      console.error('Error: circuit-computed root mismatch')
      return
    }

    const isValid = await verifyBatchUstProof(proof, publicSignals, configType)
    if (!isValid) {
      console.error(
        'Error: could not generate a valid proof or the verifying key is incorrect'
      )
      return
    }

    const result = formatProofForVerifierContract(proof)

    ctx.body = result
  }
}

export default new MaciController().router()
