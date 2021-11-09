import axios, { AxiosResponse } from 'axios'
import querystring from 'querystring'
import config from '../config'

const host = config.server.host

export const get = async (path?: string): Promise<AxiosResponse<any>> => {
  const url = path ? host + '/' + path : host
  return await axios.get(url)
}

export const post = async (
  path: string,
  data: any
): Promise<AxiosResponse<any>> => {
  const url = host + '/' + path
  return await axios.post(url, data)
}

export const getWithToken = async (
  path?: string,
  token?: string
): Promise<AxiosResponse<any>> => {
  const url = path ? host + '/' + path : host
  const Cookie = `jwt=${token}`
  return await axios.get(url, { headers: { Cookie } })
}

export const postWithToken = async (
  path: string,
  data: any,
  token: string
): Promise<AxiosResponse<any>> => {
  const url = host + '/' + path
  const Cookie = `jwt=${token}`
  return await axios.post(url, data, { headers: { Cookie } })
}

export const getToken = async (): Promise<string> => {
  const address = '0xf17f52151EbEF6C7334FAD080c5704D77216b732'
  const sig =
    '0x5356399a3493d938066a85b81db4c4fba7d88dea08c80e5dbdcc556d2de01f551d3fadde73e89a1c2433044a622879ea23b3548903927c5e2e9a9b1ff2143bc21b'
  const url = host + '/user/token'
  const res = await axios.post(
    url,
    querystring.stringify({
      address: address,
      signature: sig,
    })
  )

  const cookie = res.headers['set-cookie']
  const match = new RegExp('(^| )jwt=([^;]+)').exec(cookie)
  let token = ''
  if (match) {
    token = match[0].replace('jwt=', '')
  }
  return token
}
