jest.setTimeout(50000)

import { Keypair, PrivKey } from 'maci-domainobjs'

import app from '../app'
import config from '../config'
import { get, post } from './utils'

const port = config.server.port
const coordinatorPrivKey = config.maci.coordinatorPrivKey
const coordinator = new Keypair(new PrivKey(BigInt(coordinatorPrivKey)))

let server
let election

describe('Contract interaction API', () => {
    beforeAll(async () => {
        server = app.listen(port)
    })

    test('POST /zkcream/deploy -> should be able to deploy new cream contract', async () => {
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

        const r = await post('zkcream/deploy', data)
        expect(r.data.status).toBeTruthy()
        expect(r.data.events[r.data.events.length - 1].event).toEqual(
            'CreamCreated'
        )

        const logs = await get('zkcream/logs')
        expect(logs.data.length > 0).toBeTruthy()

        const deployedHash = logs.data[logs.data.length - 1][1] // [address, hash]
        expect(deployedHash).toEqual(hash.data.path)
    })

    test('GET /zkcream/:contractAddress -> should return contract details', async () => {
        const logs = await get('zkcream/logs')
        const contractAddress = logs.data[logs.data.length - 1][0] // [address, hash]

        const r = await get('zkcream/' + contractAddress)
        expect(election).toEqual(r.data)
    })

    afterAll(async () => {
        server.close()
    })
})
