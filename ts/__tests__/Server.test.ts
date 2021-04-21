import app from '../app'
import config from '../config'
import { get, post } from './utils'

const port = config.server.port

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

    afterAll(async () => {
        server.close()
    })
})
