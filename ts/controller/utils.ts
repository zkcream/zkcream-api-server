import * as fs from 'fs'
import * as path from 'path'
import * as ethers from 'ethers'
import { StateLeaf } from 'maci-domainobjs'

export const deployModules = async (
    votingToken,
    signUpToken,
    creamVerifier
) => {
    const votingTokenInstance = await votingToken.deploy()
    const signUpTokenInstance = await signUpToken.deploy()
    const creamVerifierInstance = await creamVerifier.deploy()
    return {
        votingTokenInstance,
        signUpTokenInstance,
        creamVerifierInstance,
    }
}

export const findHash = (address: string, arr: any) => {
    const a = arr.find((e) => e[0] === address)
    return a[1] // a = array[address, ipfsHash]
}

export const loadAbi = (name: string): string => {
    return JSON.parse(
        fs.readFileSync(path.join(__dirname, '../../abis', name)).toString()
    )
}
