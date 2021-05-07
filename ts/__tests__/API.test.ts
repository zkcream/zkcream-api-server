jest.setTimeout(50000)

import * as ethers from 'ethers'

import {
    createDeposit,
    createMessage,
    generateMerkleProof,
    pedersenHash,
    rbigInt,
    toHex,
} from 'libcream'

import { genRandomSalt } from 'maci-crypto'
import { Keypair, PrivKey } from 'maci-domainobjs'

import app from '../app'
import config from '../config'
import { genProofAndPublicSignals, get, post } from './utils'

const port = config.server.port
const coordinatorPrivKey = config.maci.coordinatorPrivKey
const coordinatorAddress = '0xf17f52151EbEF6C7334FAD080c5704D77216b732'
const coordinator = new Keypair(new PrivKey(BigInt(coordinatorPrivKey)))
const voiceCredits = ethers.BigNumber.from(2)

let deposit
let election
let nonce
let server
let userKeypair
let zkCreamAddress
let maciAddress

describe('Cream contract interaction API', () => {
    beforeAll(async () => {
        server = app.listen(port)
    })

    /* =======================================================
     * Factory part test
     */
    test('GET /factory/logs -> should return deployed zkcream contracts', async () => {
        const r = await get('factory/logs')

        // r.data should either empty [] or string[]
        expect('object').toEqual(typeof r.data)
    })

    test('POST /factory/deploy -> should be able to deploy new cream contract', async () => {
        election = {
            title: 'Fuck Martin Shkreli',
            agree: '0x6330A553Fc93768F612722BB8c2eC78aC90B3bbc',
            disagree: '0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE',
            recipients: [
                '0x6330A553Fc93768F612722BB8c2eC78aC90B3bbc',
                '0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE',
            ],
        }

        const hash = await post('ipfs', election)

        const data = {
            initial_voice_credit_balance: 100,
            merkle_tree_height: 4,
            coordinator_pubkey: coordinator.pubKey.asContractParam(),
            coordinator_address: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
            recipients: election.recipients,
            ipfsHash: hash.data.path,
        }

        const r = await post('factory/deploy', data)
        expect(r.data.status).toBeTruthy()
        expect(r.data.events[r.data.events.length - 1].event).toEqual(
            'CreamCreated'
        )

        const logs = await get('factory/logs')
        expect(logs.data.length > 0).toBeTruthy()

        const deployedHash = logs.data[logs.data.length - 1][1] // [address, hash]
        expect(deployedHash).toEqual(hash.data.path)
    })

    /* =======================================================
     * Cream part test
     */
    // TODOp: Need to fetch more contract details such as #of deposit token, aprooved, maci address and tallyHash etc
    test('GET /zkcream/:address -> should return contract details', async () => {
        const logs = await get('factory/logs')
        zkCreamAddress = logs.data[logs.data.length - 1][0] // get last deployed address
        const r = await get('zkcream/' + zkCreamAddress)
        election.approved = false
        election.tallyHash = ''
        election.maciAddress = null

        maciAddress = r.data['maciAddress']
        for (let prop in election) {
            if (prop != 'maciAddress') {
                expect(r.data.prop).toEqual(election.prop)
            }
        }
    })

    // TODO: Need authentication for voter's address
    test('GET /zkcream/faucet/:address/:voter -> should correctly distribute token to voter', async () => {
        const voter = '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef'
        const r = await get('zkcream/faucet/' + zkCreamAddress + '/' + voter)
        expect(r.data.status).toBeTruthy()
        expect(r.data.events[r.data.events.length - 1].event).toEqual(
            'Transfer'
        )

        // check if voter received token
        const r2 = await get('zkcream/' + zkCreamAddress + '/' + voter)
        expect(r2.data[0]).toEqual(1)
    })

    test('POST /zkcream/deposit/:address -> should correctly deposit voting token', async () => {
        deposit = createDeposit(rbigInt(31), rbigInt(31))
        const voter = '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef'
        const data = {
            commitment: toHex(deposit.commitment),
            voter,
        }
        const r = await post('zkcream/deposit/' + zkCreamAddress, data)
        expect(r.data.status).toBeTruthy()
        expect(r.data.events[r.data.events.length - 1].event).toEqual('Deposit')

        // check if voter do not onw token any more
        const r2 = await get('zkcream/' + zkCreamAddress + '/' + voter)
        expect(r2.data[0]).toEqual(0)
    })

    test('GET /zkcream/deposit/logs/:address -> should return deposit events', async () => {
        const r = await get('zkcream/deposit/logs/' + zkCreamAddress)
        expect(r.data[0][0]).toEqual(toHex(deposit.commitment))
    })

    test('POST /zkcream/signup/:address -> should be able to sign up MACI', async () => {
        const params = {
            depth: 4,
            zero_value:
                '2558267815324835836571784235309882327407732303445109280607932348234378166811',
        }
        const { root, merkleProof } = await generateMerkleProof(
            deposit,
            zkCreamAddress,
            params
        )

        const input = {
            root,
            nullifierHash: pedersenHash(deposit.nullifier.leInt2Buff(31))
                .babyJubX,
            nullifier: deposit.nullifier,
            secret: deposit.secret,
            path_elements: merkleProof[0],
            path_index: merkleProof[1],
        }

        userKeypair = new Keypair()
        const userPubKey = userKeypair.pubKey.asContractParam()

        const formattedProof = await genProofAndPublicSignals(
            input,
            'prod/vote.circom',
            'build/vote.zkey',
            'circuits/vote.wasm'
        )

        const voter = '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef'

        const data = {
            root: toHex(input.root),
            nullifierHash: toHex(input.nullifierHash),
            userPubKey,
            formattedProof,
            voter,
        }
        const r = await post('zkcream/signup/' + zkCreamAddress, data)
        expect(r.data.status).toBeTruthy()

        // voter owns signUp token
        const r2 = await get('zkcream/' + zkCreamAddress + '/' + voter)
        expect(r2.data[1]).toEqual(1)
    })

    /* =======================================================
     * MACI part test
     */
    test('POST /maci/publish/:address -> should be able to publish message', async () => {
        const voteIndex = 0
        const voter = '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef'
        nonce = 1
        let [message, encPubKey] = createMessage(
            BigInt(1),
            userKeypair,
            null,
            coordinator.pubKey,
            BigInt(voteIndex),
            voiceCredits,
            BigInt(nonce),
            genRandomSalt()
        )

        const data = {
            message: message.asContractParam(),
            encPubKey: encPubKey.asContractParam(),
            voter,
        }

        const r = await post('maci/publish/' + maciAddress, data)
        expect(r.data.events[r.data.events.length - 1].event).toEqual(
            'PublishMessage'
        )
    })

    test('POST /maci/publish/:address -> should also be able to publish keychange message', async () => {
        const voteIndex = 0
        const voter = '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef'
        nonce = 1
        const newUserKeyPair = new Keypair()
        let [message, encPubKey] = createMessage(
            BigInt(1),
            userKeypair,
            newUserKeyPair,
            coordinator.pubKey,
            null,
            null,
            BigInt(nonce)
        )

        const data = {
            message: message.asContractParam(),
            encPubKey: encPubKey.asContractParam(),
            voter,
        }
        const r = await post('maci/publish/' + maciAddress, data)
        expect(r.data.events[r.data.events.length - 1].event).toEqual(
            'PublishMessage'
        )
    })

    test('GET /maci/params/:address -> should return maci params for generating maci state', async () => {
        const r = await get('maci/params/' + maciAddress)

        const {
            stateTreeDepth,
            messageTreeDepth,
            voteOptionTreeDepth,
            maxVoteOptionIndex,
            signUpLogs,
            publishMessageLogs,
        } = r.data

        expect(stateTreeDepth).toEqual('4')
        expect(messageTreeDepth).toEqual('4')
        expect(voteOptionTreeDepth).toEqual('2')
        expect(maxVoteOptionIndex).toEqual('3')
        expect(signUpLogs.length > 0).toBeTruthy()
        expect(signUpLogs.length > 0).toBeTruthy()
    })

    afterAll(async () => {
        server.close()
    })
})
