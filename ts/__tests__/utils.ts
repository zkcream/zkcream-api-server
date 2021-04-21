import axios, { AxiosResponse } from 'axios'

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
