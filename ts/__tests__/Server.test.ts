import axios, { AxiosResponse } from 'axios'
import app from '../app'

const port = 3001
const host = 'http://localhost:' + port

const get = async (path?: string): Promise<AxiosResponse<any>> => {
    const url = path ? host + '/' + path : host
    return await axios.get(url)
}

let server

describe('Server API', () => {
    beforeAll(async () => {
        server = app.listen(port)
    })

    test('echo server', async () => {
        const e = 'zkCREAM'
        const r = await get(e)
        expect(e).toEqual(r.data.msg)
    })

    afterAll(async () => {
        server.close()
    })
})
