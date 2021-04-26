import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

import axios, { AxiosResponse } from 'axios'
import { SnarkBigInt, MerkleTree } from 'cream-merkle-tree'
import { toHex } from 'libcream'

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

const compileAndLoadCircuit = async (circuitFileName: string) => {
    const circuit = await tester(
        path.join(
            __dirname,
            '../../../cream/packages/circuits/circom',
            circuitFileName
        )
    )
    await circuit.loadSymbols()
    return circuit
}

export const genProofAndPublicSignals = async (
    inputs: any,
    circuitFileName: string,
    zkeyFileName: string,
    circuitWasmFileName: string,
    circuit?: any
): Promise<FormattedProof<string>> => {
    const creamCircuitsPath = path.join(
        __dirname,
        '../../../cream/packages/circuits'
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
    const wtnsPath: string = path.join(
        creamCircuitsPath,
        './build/witness.wtns'
    )
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
        circuit = await compileAndLoadCircuit(circuitFileName)
    }

    fs.writeFileSync(inputsJsonPath, JSON.stringify(stringifyBigInts(inputs)))

    // snarkjs wc [.wasm] [input.json] [witness.wtns]
    execSync(
        `${snarkjsCmd} wc ${circuitWasmPath} ${inputsJsonPath} ${wtnsPath}`
    )

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
