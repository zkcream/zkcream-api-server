import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import axios, { AxiosResponse } from 'axios'

import config from '../config'

const ff = require('ffjavascript')
const tester = require('circom').tester

const stringifyBigInts: (obj: object) => any = ff.utils.stringifyBigInts
const unstringifyBigInts: (obj: object) => any = ff.utils.unstringifyBigInts

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
