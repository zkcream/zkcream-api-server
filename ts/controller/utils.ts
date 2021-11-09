import * as fs from 'fs'
import * as path from 'path'
import appRoot from 'app-root-path'
import * as ethers from 'ethers'
import { execSync } from 'child_process'
import config from '../config'

const ff = require('ffjavascript')
const tester = require('circom').tester

const stringifyBigInts: (obj: object) => any = ff.utils.stringifyBigInts
const unstringifyBigInts: (obj: object) => any = ff.utils.unstringifyBigInts

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

export const getMaciLogs = async (
  provider: ethers.providers.JsonRpcProvider,
  maciContract: ethers.Contract,
  eventName: string
) => {
  return eventName === 'SignUp'
    ? await provider.getLogs({
        ...maciContract.filters.SignUp(),
        fromBlock: 0,
      })
    : await provider.getLogs({
        ...maciContract.filters.PublishMessage(),
        fromBlock: 0,
      })
}

interface Proof {
  pi_a: string[]
  pi_b: string[]
  pi_c: string[]
  protocol: 'groth16'
}

type FormattedProof<T> = {
  0: T
  1: T
  2: T
  3: T
  4: T
  5: T
  6: T
  7: T
}

const compileAndLoadCircuit = async (
  circuitFileName: string,
  creamPath: string
) => {
  const circuit = await tester(
    path.join(creamPath, '/circom/', circuitFileName)
  )
  await circuit.loadSymbols()
  return circuit
}

export const formatProofForVerifierContract = (
  _proof: Proof
): FormattedProof<string> => {
  return <any>(
    [
      _proof.pi_a[0],
      _proof.pi_a[1],
      _proof.pi_b[0][1],
      _proof.pi_b[0][0],
      _proof.pi_b[1][1],
      _proof.pi_b[1][0],
      _proof.pi_c[0],
      _proof.pi_c[1],
    ].map((x) => x.toString())
  )
}

export const genProofAndPublicSignals = async (
  inputs: any,
  circuitFileName: string,
  zkeyFileName: string,
  circuitWasmFileName: string,
  circuit?: any
): Promise<FormattedProof<string>> => {
  const creamCircuitsPath = path.join(
    appRoot.path,
    './zkcream/packages/circuits'
  )

  const zkeyPath: string = path.join(creamCircuitsPath, zkeyFileName)
  const circuitWasmPath: string = path.join(
    creamCircuitsPath,
    './build/',
    circuitWasmFileName
  )
  const inputsJsonPath: string = path.join(
    creamCircuitsPath,
    './build/input.json'
  )
  const wtnsPath: string = path.join(creamCircuitsPath, './build/witness.wtns')
  const witnessJsonPath: string = path.join(
    creamCircuitsPath,
    './build/witness.json'
  )
  const publicJsonPath: string = path.join(
    creamCircuitsPath,
    './build/public.json'
  )
  const proofPath: string = path.join(creamCircuitsPath, './build/proof.json')
  const snarkjsCmd: string =
    'node ' +
    path.join(creamCircuitsPath, './node_modules/snarkjs/build/cli.cjs')

  if (!circuit) {
    circuit = await compileAndLoadCircuit(circuitFileName, creamCircuitsPath)
  }

  fs.writeFileSync(inputsJsonPath, JSON.stringify(stringifyBigInts(inputs)))

  // snarkjs wc [.wasm] [input.json] [witness.wtns]
  execSync(`${snarkjsCmd} wc ${circuitWasmPath} ${inputsJsonPath} ${wtnsPath}`)

  // snrakjs wej [witness.wtns] [witness.json]
  execSync(`${snarkjsCmd} wej ${wtnsPath} ${witnessJsonPath}`)

  // snarkjs g16p [.zkey] [witness.wtns] [proof.json] [public.json]
  execSync(
    `${snarkjsCmd} g16p ${zkeyPath} ${wtnsPath} ${proofPath} ${publicJsonPath} `
  )

  const witness = unstringifyBigInts(
    JSON.parse(fs.readFileSync(witnessJsonPath).toString())
  )
  await circuit.checkConstraints(witness)

  const proof: Proof = JSON.parse(fs.readFileSync(proofPath).toString())

  // remove files
  execSync(`rm -f ${wtnsPath} `)
  execSync(`rm -f ${witnessJsonPath} `)
  execSync(`rm -f ${publicJsonPath} `)
  execSync(`rm -f ${proofPath} `)
  execSync(`rm -f ${inputsJsonPath} `)

  return formatProofForVerifierContract(proof)
}

export const verifyOrigin = (ctx) => {
  const allowedOrigins = config.cors.origins
  const origin = ctx.headers.origin
  if (allowedOrigins.indexOf(origin) !== -1 && origin != null) {
    return origin
  }
  ctx.throw(401, 'unauthorized')
}

export const extractTokenFromCookie = (cookie): string => {
  let token = ''
  if (cookie) {
    token = cookie.replace('jwt=', '')
  }
  return token
}
