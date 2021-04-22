jest.setTimeout(50000)

import { createDeposit, rbigInt, toHex } from 'libcream'
import { Keypair, PrivKey } from 'maci-domainobjs'

import app from '../app'
import config from '../config'
import { get, post } from './utils'

const port = config.server.port
const coordinatorPrivKey = config.maci.coordinatorPrivKey
const coordinator = new Keypair(new PrivKey(BigInt(coordinatorPrivKey)))

let server
let election
let zkCreamAddress
let deposit

describe('Cream contract interaction API', () => {
    beforeAll(async () => {
        server = app.listen(port)
    })

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

    test('GET /zkcream/:address -> should return contract details', async () => {
        const logs = await get('factory/logs')
        zkCreamAddress = logs.data[logs.data.length - 1][0] // get last deployed address
        const r = await get('zkcream/' + zkCreamAddress)
        expect(r.data).toEqual(election)
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

    afterAll(async () => {
        server.close()
    })
})
