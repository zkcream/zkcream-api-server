import axios, { AxiosResponse } from 'axios'
import querystring from 'querystring'
import config from '../config'

const host = config.server.host
export const testonlyuser = '!!onlyfortest!!'

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
  const Authorization = `Bearer ${token}`
  return await axios.get(url, { headers: { Authorization } })
}

export const postWithToken = async (
  path: string,
  data: any,
  token: string
): Promise<AxiosResponse<any>> => {
  const url = host + '/' + path
  const Authorization = `Bearer ${token}`
  return await axios.post(url, data, { headers: { Authorization } })
}

export const register = async (): Promise<AxiosResponse<any>> => {
  const url = host + '/user/register'
  return await axios.post(url, {
    username: testonlyuser,
    password: testonlyuser,
  })
}

export const login = async (): Promise<AxiosResponse<any>> => {
  const url = host + '/user/login'
  return await axios.post(
    url,
    querystring.stringify({
      username: testonlyuser,
      password: testonlyuser,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )
}
