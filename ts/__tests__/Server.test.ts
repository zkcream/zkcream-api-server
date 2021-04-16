import axios, { AxiosResponse } from 'axios'

import app from '../app'
import config from '../config'

const port = config.server.port
const host = config.server.host

const get = async (path?: string): Promise<AxiosResponse<any>> => {
    const url = path ? host + '/' + path : host
    return await axios.get(url)
}

let server

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

    afterAll(async () => {
        server.close()
    })
})
