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
  genQvtProofAndPublicSignals,
  verifyBatchUstProof,
  verifyQvtProof,
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
    )
      .post('/genproof', this.genProof.bind(this))
      .post('/gen_qvtproof', this.genQvtProof.bind(this))
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

  private genQvtProof = async (ctx: Koa.Context) => {
    const {
      circuitInputs,
      configType,
      newResultsCommitment,
      newSpentVoiceCreditsCommitment,
      newPerVOSpentVoiceCreditsCommitment,
      contractPublicSignals,
    } = ctx.request.body
    const {
      circuit,
      witness,
      proof,
      publicSignals,
    } = await genQvtProofAndPublicSignals(JSON.parse(circuitInputs), configType)

    // The vote tally commmitment
    const expectedNewResultsCommitmentOutput = getSignalByName(
      circuit,
      witness,
      'main.newResultsCommitment'
    )

    if (
      expectedNewResultsCommitmentOutput.toString() !==
      JSON.parse(newResultsCommitment).toString()
    ) {
      console.error('Error: result commitment mismatch')
      return
    }

    // The commitment to the total spent voice credits
    const expectedSpentVoiceCreditsCommitmentOutput = getSignalByName(
      circuit,
      witness,
      'main.newSpentVoiceCreditsCommitment'
    )

    if (
      expectedSpentVoiceCreditsCommitmentOutput.toString() !==
      JSON.parse(newSpentVoiceCreditsCommitment).toString()
    ) {
      console.error('Error: total spent voice credits commitment mismatch')
      return
    }

    // The commitment to the spent voice credits per vote option
    const expectedPerVOSpentVoiceCreditsCommitmentOutput = getSignalByName(
      circuit,
      witness,
      'main.newPerVOSpentVoiceCreditsCommitment'
    )

    if (
      expectedPerVOSpentVoiceCreditsCommitmentOutput.toString() !==
      JSON.parse(newPerVOSpentVoiceCreditsCommitment).toString()
    ) {
      console.error(
        'Error: total spent voice credits per vote option commitment mismatch'
      )
      return
    }

    // const publicSignalMatch =
    //   JSON.stringify(publicSignals.map((x) => x.toString())) ===
    //   JSON.stringify(contractPublicSignals.map((x) => BigInt(parseInt(x.hex, 16)).toString()))

    // if (!publicSignalMatch) {
    //   console.error('Error: public signal mismatch')
    //   return
    // }

    const isValid = verifyQvtProof(proof, publicSignals, configType)
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
