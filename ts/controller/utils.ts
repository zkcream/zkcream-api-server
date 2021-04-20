import fs from 'fs'
import path from 'path'

export const deployModules = async (
    votingToken,
    signUpToken,
    creamVerifier
) => {
    const votingTokenContract = await votingToken.deploy()
    const signUpTokenContract = await signUpToken.deploy()
    const creamVerifierContract = await creamVerifier.deploy()
    return {
        votingTokenContract,
        signUpTokenContract,
        creamVerifierContract,
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
