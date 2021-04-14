import axios from 'axios'
import app from '../app'

const port = 3001

let server

describe('Server API', () => {
    beforeAll(async () => {
        server = app.listen(port)
    })

    test('echo server', async () => {
        const r = await axios.get('http://localhost:3001/vote/')
        const e = 'hello\n'
        expect(e).toEqual(r.data)
    })

    afterAll(async () => {
        server.close()
    })
})
