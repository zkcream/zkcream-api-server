jest.setTimeout(50000)

import axios, { AxiosResponse } from 'axios'
import { Keypair, PrivKey } from 'maci-domainobjs'

import app from '../app'
import config from '../config'

const port = config.server.port
const host = config.server.host
const coordinatorPrivKey = config.maci.coordinatorPrivKey
const coordinator = new Keypair(new PrivKey(BigInt(coordinatorPrivKey)))

const get = async (path?: string): Promise<AxiosResponse<any>> => {
    const url = path ? host + '/' + path : host
    return await axios.get(url)
}

const post = async (path: string, data: any): Promise<AxiosResponse<any>> => {
    const url = host + '/' + path
    return await axios.post(url, data)
}

let server
let election

describe('Server API', () => {
    beforeAll(async () => {
        server = app.listen(port)
    })

    test('GET /:msg -> should echo msg', async () => {
        const e = 'zkCREAM'
        const r = await get(e)
        expect(e).toEqual(r.data.msg)
    })

    test('GET /zkcream/logs -> should return deployed zkcream contracts', async () => {
        const r = await get('zkcream/logs')

        // r.data should either empty [] or string[]
        expect('object').toEqual(typeof r.data)
    })

    test('POST /ipfs -> should return hash', async () => {
        const data = {
            msg: 'zkCREAM',
        }
        const e = 'QmeT5VjyMrbL5HPHxy4UkjR5pijPhbHsV9w5T9MRDwEnkf'
        const r = await post('ipfs', data)
        expect(e).toEqual(r.data.path)
    })

    test('GET /ipfs -> should return correct data', async () => {
        const hash = 'QmeT5VjyMrbL5HPHxy4UkjR5pijPhbHsV9w5T9MRDwEnkf'
        const e = {
            msg: 'zkCREAM',
        }
        const r = await get('ipfs/' + hash)
        expect(e).toEqual(r.data)
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
