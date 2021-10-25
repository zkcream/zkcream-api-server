import axios from 'axios'
import { ethers, BigNumber } from 'ethers'
import app from '../app'
import config from '../config'
import {
  get,
  post,
  register,
  login,
  testonlyuser,
  getWithToken,
  postWithToken,
} from './utils'
import { User } from '../model/user'
import mongoose from 'mongoose'

const port = config.server.port

let server
let token

describe('Server API', () => {
  beforeAll(async () => {
    await User.findOneAndDelete({ username: testonlyuser }).exec()
    server = app.listen(port)
    await register()
    const r = await login()
    token = r.data.token
  })

  test('logged in? -> should have token', async () => {
    expect(token).toHaveLength
  })

  test('verify -> should be verified without error', async () => {
    const r = await getWithToken('user/verify', token)
    expect(r.status).toEqual(200)
  })

  test('GET /:msg -> should echo msg', async () => {
    const e = 'zkCREAM'
    const r = await get(e)
    expect(e).toEqual(r.data.msg)
  })

  test('POST /ipfs -> should return hash', async () => {
    const data = {
      msg: 'zkCREAM',
    }
    const e = 'QmeT5VjyMrbL5HPHxy4UkjR5pijPhbHsV9w5T9MRDwEnkf'
    const r = await postWithToken('ipfs', data, token)
    expect(e).toEqual(r.data.path)
  })

  test('GET /ipfs -> should return correct data', async () => {
    const hash = 'QmeT5VjyMrbL5HPHxy4UkjR5pijPhbHsV9w5T9MRDwEnkf'
    const e = {
      msg: 'zkCREAM',
    }
    const r = await getWithToken('ipfs/' + hash, token)
    expect(e).toEqual(r.data)
  })

  test('POST /faucet -> should be able to transfer eth', async () => {
    let id = Math.floor(Math.random() * 1000000000) + 1
    const to = '0xf17f52151ebef6c7334fad080c5704d77216b732'
    const value = ethers.BigNumber.from(config.eth.faucet.value)

    const r1 = await axios.post(config.eth.url, {
      jsonrpc: 2.0,
      id,
      method: 'eth_getBalance',
      params: [to, 'latest'],
    })

    const before: BigNumber = ethers.BigNumber.from(r1.data.result)

    await postWithToken('faucet/', { to: to }, token)

    id = id + 1
    const r2 = await axios.post(config.eth.url, {
      jsonrpc: 2.0,
      id,
      method: 'eth_getBalance',
      params: [to, 'latest'],
    })

    const after = ethers.BigNumber.from(r2.data.result.toString())

    expect(before.add(value).eq(after))
  })

  test('POST /faucet without token -> request should fail with 401', async () => {
    const to = '0xf17f52151ebef6c7334fad080c5704d77216b732'
    try {
      await post('faucet/', { to: to })
    } catch (e: any) {
      expect(e.message).toEqual('Request failed with status code 401')
    }
  })

  afterAll(async () => {
    await User.findOneAndDelete({ username: testonlyuser }).exec()
    await mongoose.connection.close()
    await server.close()
  })
})
