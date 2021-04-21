import * as ethers from 'ethers'
import Router from 'koa-router'
import Koa from 'koa'

import config from '../config'
import { IController } from './interface'
import { deployModules, loadAbi } from './utils'

import C_Verifier from '../../abis/CreamVerifier.json'
import S_Token from '../../abis/SignUpToken.json'
import V_Token from '../../abis/VotingToken.json'

const maciFactoryAddress = config.eth.contracts.maciFactory
const maciFactoryAbi = loadAbi('MaciFactory.abi')
const creamFactoryAbi = loadAbi('CreamFactory.abi')
const creamAbi = loadAbi('Cream.abi')

const port = config.server.port

class FactoryController implements IController {
    private Router = new Router({
        prefix: '/factory',
    })
    private provider: ethers.providers.JsonRpcProvider
    private signer: ethers.Wallet
    public creamFactoryAddress: string
    public creamFactoryInstance: ethers.Contract

    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(config.eth.url)
        this.signer = new ethers.Wallet(config.eth.adminKey, this.provider)
        this.creamFactoryAddress = config.eth.contracts.creamFactory
        this.creamFactoryInstance = new ethers.Contract(
            this.creamFactoryAddress,
            creamFactoryAbi,
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
                logs = []
                ctx.body = logs
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
        // TODO: move check ownerhip to init()
        // Check if MACIFactory is owned by CreamFactory contract
        const maciFactoryContract = new ethers.Contract(
            maciFactoryAddress,
            maciFactoryAbi,
            this.signer
        )
        if ((await maciFactoryContract.owner()) != this.creamFactoryAddress) {
            await maciFactoryContract.transferOwnership(
                this.creamFactoryAddress
            )
        }

        // TODO: Switch this.siger to sender's account
        // Deploy votingToken, signUpToken and creamVerifier
        const votingToken = new ethers.ContractFactory(
            V_Token.abi,
            V_Token.bytecode,
            this.signer
        )
        const signUpToken = new ethers.ContractFactory(
            S_Token.abi,
            S_Token.bytecode,
            this.signer
        )
        const creamVerifier = new ethers.ContractFactory(
            C_Verifier.abi,
            C_Verifier.bytecode,
            this.signer
        )

        const {
            votingTokenInstance,
            signUpTokenInstance,
            creamVerifierInstance,
        } = await deployModules(votingToken, signUpToken, creamVerifier)

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
