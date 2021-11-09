jest.setTimeout(50000)

import * as ethers from 'ethers'

import {
  createDeposit,
  createMessage,
  generateMerkleProof,
  pedersenHash,
  rbigInt,
  toHex,
} from 'libcream'

import { genRandomSalt } from 'maci-crypto'
import { Keypair, PrivKey } from 'maci-domainobjs'

import app from '../app'
import config from '../config'
import { getWithToken, postWithToken, getToken } from './utils'

import V_Token from '../../abis/VotingToken.json'
import Cream from '../../abis/Cream.json'
import MACI from '../../abis/MACI.json'

import { TokenType } from '../controller/cream'
import { redisClient } from '../db/redis'

const port = config.server.port
const coordinatorPrivKey =
  '2222222222263902553431241761119057960280734584214105336279476766401963593688'
const coordinatorAddress = '0xf17f52151EbEF6C7334FAD080c5704D77216b732'
const coordinator = new Keypair(new PrivKey(BigInt(coordinatorPrivKey)))
const provider = new ethers.providers.JsonRpcProvider(config.eth.url)
const ownerSigner = new ethers.Wallet(config.eth.adminKey, provider)
const voiceCredits = ethers.BigNumber.from(2)

let deposit
let election
let nonce
let server
let userKeypair
let zkCreamAddress
let zkCreamInstance
let maciAddress
let maciInstance
let voter
let votingSigner
let token

describe('Cream contract interaction API', () => {
  beforeAll(async () => {
    await redisClient.flushdb()
    server = app.listen(port)
    token = await getToken()
  })

  /* =======================================================
   * Factory part test
   */
  test('GET /factory/logs -> should return deployed zkcream contracts', async () => {
    const r = await getWithToken('factory/logs', token)

    // r.data should either error object or string[]
    expect('object').toEqual(typeof r.data)
  })

  test('POST /factory/deploy -> should be able to deploy new cream contract', async () => {
    election = {
      title: 'Fuck Martin Shkreli',
      agree: '0x6330A553Fc93768F612722BB8c2eC78aC90B3bbc',
      disagree: '0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE',
      recipients: [
        '0x6330A553Fc93768F612722BB8c2eC78aC90B3bbc',
        '0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE',
      ],
    }

    const hash = await postWithToken('ipfs', election, token)

    const data = {
      initial_voice_credit_balance: 100,
      merkle_tree_height: 4,
      coordinator_pubkey: coordinator.pubKey.asContractParam(),
      coordinator_address: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
      recipients: election.recipients,
      ipfsHash: hash.data.path,
    }

    const r = await postWithToken('factory/deploy', data, token)
    expect(r.data.status).toBeTruthy()
    expect(r.data.events[r.data.events.length - 1].event).toEqual(
      'CreamCreated'
    )

    const logs = await getWithToken('factory/logs', token)
    expect(logs.data.length > 0).toBeTruthy()

    const deployedHash = logs.data[logs.data.length - 1][1] // [address, hash]
    expect(deployedHash).toEqual(hash.data.path)
  })

  /* =======================================================
   * Cream part test
   */
  test('GET /zkcream/:address -> should return contract details', async () => {
    const logs = await getWithToken('factory/logs', token)
    zkCreamAddress = logs.data[logs.data.length - 1][0] // get last deployed address
    const r = await getWithToken('zkcream/' + zkCreamAddress, token)
    election.approved = false
    election.tallyHash = ''
    election.maciAddress = null

    maciAddress = r.data['maciAddress']
    for (let prop in election) {
      if (prop != 'maciAddress') {
        expect(r.data.prop).toEqual(election.prop)
      }
    }
  })

  test('GET /zkcream/:address/:voter -> should return correct initial status', async () => {
    voter = '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef'

    const r = await getWithToken(
      'zkcream/' + zkCreamAddress + '/' + voter,
      token
    )

    expect(r.data.holdingToken).toEqual(0)
    expect(r.data.isApproved).toEqual(0)
  })

  test('GET /zkcream/deposit/logs/:address -> should return deposit events', async () => {
    // transfer token to voter
    votingSigner = provider.getSigner(voter)
    zkCreamInstance = new ethers.Contract(
      zkCreamAddress,
      Cream.abi,
      votingSigner
    )

    const votingTokenAddress = await zkCreamInstance.votingToken()
    let votingTokenInstance = new ethers.Contract(
      votingTokenAddress,
      V_Token.abi,
      ownerSigner
    )
    let tx = await votingTokenInstance.giveToken(voter)
    let r = await tx.wait()

    if (!r.status) {
      console.error('[giveToken] error')
    }

    // assert token status
    r = await getWithToken('zkcream/' + zkCreamAddress + '/' + voter, token)
    expect(r.data.holdingToken).toEqual(1)

    // deposit token
    deposit = createDeposit(rbigInt(31), rbigInt(31))
    votingTokenInstance = votingTokenInstance.connect(votingSigner)
    await votingTokenInstance.setApprovalForAll(zkCreamAddress, true)

    // assert token approval
    r = await getWithToken('zkcream/' + zkCreamAddress + '/' + voter, token)
    expect(r.data.isApproved).toBeTruthy()

    tx = await zkCreamInstance.deposit(toHex(deposit.commitment))
    r = await tx.wait()

    if (!r.status) {
      console.error('[deposit] error')
    }

    r = await getWithToken('zkcream/deposit/logs/' + zkCreamAddress, token)
    expect(r.data[0][0]).toEqual(toHex(deposit.commitment))
  })

  test('should be able to sign up MACI', async () => {
    const params = {
      depth: 4,
      zero_value:
        '2558267815324835836571784235309882327407732303445109280607932348234378166811',
    }
    const { root, merkleProof } = await generateMerkleProof(
      deposit,
      zkCreamAddress,
      params,
      token
    )

    const input = {
      root,
      nullifierHash: pedersenHash(deposit.nullifier.leInt2Buff(31)).babyJubX,
      nullifier: deposit.nullifier,
      secret: deposit.secret,
      path_elements: merkleProof[0],
      path_index: merkleProof[1],
    }

    const data = {
      input: JSON.stringify(input, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ),
    }

    const formattedProof = await postWithToken('zkcream/genproof', data, token)

    userKeypair = new Keypair()
    const userPubKey = userKeypair.pubKey.asContractParam()
    const args = [toHex(input.root), toHex(input.nullifierHash)]

    const tx = await zkCreamInstance.signUpMaci(
      userPubKey,
      formattedProof.data,
      ...args
    )
    const r = await tx.wait()

    expect(r.status).toBeTruthy()

    // voter owns signUp token
    const voter = '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef'
    const r2 = await getWithToken(
      'zkcream/' + zkCreamAddress + '/' + voter,
      token
    )

    expect(r2.data.holdingToken).toEqual(TokenType.SIGNUP)
  })

  /* =======================================================
   * MACI part test
   */
  test('GET /maci/params/:address -> should return maci params for generating maci state', async () => {
    const voteIndex = 0
    const voter = '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef'
    nonce = 1
    let [message, encPubKey] = createMessage(
      BigInt(1),
      userKeypair,
      null,
      coordinator.pubKey,
      BigInt(voteIndex),
      voiceCredits,
      BigInt(nonce),
      genRandomSalt()
    )

    maciInstance = new ethers.Contract(maciAddress, MACI.abi, votingSigner)

    const tx = await maciInstance.publishMessage(
      message.asContractParam(),
      encPubKey.asContractParam()
    )
    let r = await tx.wait()
    expect(r.events[r.events.length - 1].event).toEqual('PublishMessage')

    // key change message

    // const newUserKeyPair = new Keypair()
    // let [message, encPubKey] = createMessage(
    //   BigInt(1),
    //   userKeypair,
    //   newUserKeyPair,
    //   coordinator.pubKey,
    //   null,
    //   null,
    //   BigInt(nonce)
    // )

    r = await getWithToken('maci/params/' + maciAddress, token)

    const {
      stateTreeDepth,
      messageTreeDepth,
      voteOptionTreeDepth,
      maxVoteOptionIndex,
      coordinatorPubKey,
      signUpLogs,
      publishMessageLogs,
      totalVotes,
      hasUnprocessedMessages,
    } = r.data

    const contractPubKey = [
      BigInt(coordinatorPubKey[0].hex),
      BigInt(coordinatorPubKey[1].hex),
    ]

    expect(stateTreeDepth).toEqual(4)
    expect(messageTreeDepth).toEqual(4)
    expect(voteOptionTreeDepth).toEqual(2)
    expect(maxVoteOptionIndex).toEqual(3)
    expect(contractPubKey).toEqual(coordinator.pubKey.rawPubKey)
    expect(signUpLogs.length > 0).toBeTruthy()
    expect(publishMessageLogs.length > 0).toBeTruthy()
    expect(totalVotes).toEqual(0)
    expect(hasUnprocessedMessages).toBeTruthy()
  })

  /* =======================================================
   * Finalizing part test
   */
  test('should be able to publish tally', async () => {
    const result = {
      results: {
        tally: ['1', '0'],
      },
    }
    const r_hash = await postWithToken('ipfs', result, token)

    const coordinatorSigner = provider.getSigner(coordinatorAddress)
    zkCreamInstance = zkCreamInstance.connect(coordinatorSigner)

    const tx = await zkCreamInstance.publishTallyHash(r_hash.data.path)
    const r = await tx.wait()

    expect(r.events[0].event).toEqual('TallyPublished')

    const r2 = await getWithToken('zkcream/' + zkCreamAddress, token)
    const r2_obj = await getWithToken('ipfs/' + r2.data.tallyHash, token)
    expect(r2_obj.data).toEqual(result)
  })

  test('POST /zkcream/approve/:address -> should be able to approve', async () => {
    const data = {
      owner: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
    }

    const r = await postWithToken(
      'zkcream/approve/' + zkCreamAddress,
      data,
      token
    )
    expect(r.data.events[0].event).toEqual('TallyApproved')
  })

  test('should be able to withdraw', async () => {
    const data = {
      coordinator: coordinatorAddress,
    }

    const hash = await zkCreamInstance.tallyHash()
    const recipients = await zkCreamInstance.getRecipients()

    const r_tally = await getWithToken('ipfs/' + hash, token)
    const resultsArr = r_tally.data.results.tally

    for (let i = 0; i < recipients.length; i++) {
      const count = resultsArr[i]
      for (let j = 0; j < count; j++) {
        const tx = await zkCreamInstance.withdraw(i)
        if (tx) {
          await tx.wait()
        }
      }
    }

    // check if recipients received a token
    const r2 = await getWithToken(
      'zkcream/tally/' + zkCreamAddress + '/' + election.recipients[0],
      token
    )
    expect(r2.data).toEqual(1)
  })

  afterAll(async () => {
    await redisClient.flushdb()
    redisClient.disconnect()
    await server.close()
  })
})
