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
    '0x9d1aa2aaf05341456910dfefee0f4023e2431487cd3485396c2703efff38bf2960bbea386c0d83623044aded193e32c97c9e59b61411af436b279366a607f2f51b'
  const url = host + '/user/token'
  const res = await axios.post(
    url,
    querystring.stringify({
      address: address,
      signature: sig,
    })
  )

  const cookie = res.headers['set-cookie']
  const jwtToken = /[^;]*/.exec(cookie)
  if (jwtToken != null) {
    const token = jwtToken[0].replace('jwt=', '')
    return token
  }
  return ''
}
