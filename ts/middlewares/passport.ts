import passport from 'koa-passport'
import passportJwt from 'passport-jwt'
import passportLocal from 'passport-local'

import config from '../config'
import {
  ecrecover,
  fromRpcSig,
  keccak256,
  pubToAddress,
  bufferToHex,
} from 'ethereumjs-util'

const LocalStrategy = passportLocal.Strategy
const JwtStrategy = passportJwt.Strategy

const ETH_SIG_PREFIX = '\x19Ethereum Signed Message:\n'
const DATA_TO_SIGN = 'zkcream'

passport.use(
  new LocalStrategy(
    {
      usernameField: 'address',
      passwordField: 'signature',
    },
    (username, password, done) => {
      const address = username.toLowerCase()
      const signature = password
      const prefix = Buffer.from(ETH_SIG_PREFIX)
      const buffer = Buffer.concat([
        prefix,
        Buffer.from(String(DATA_TO_SIGN.length)),
        Buffer.from(DATA_TO_SIGN),
      ])
      const hash = keccak256(buffer)

      if (signature != null) {
        const res = fromRpcSig(signature)
        const pubkey = ecrecover(hash, res.v, res.r, res.s)
        const addressEthJs = bufferToHex(pubToAddress(pubkey)).toLowerCase()
        if (address == addressEthJs) {
          return done(undefined, true)
        } else {
          return done(undefined, false)
        }
      }
    }
  )
)

const cookieExtractor = function (req) {
  let token = ''
  if (req.headers.cookie) {
    token = req.headers.cookie.replace('jwt=', '')
  }
  return token
}

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: cookieExtractor,
      secretOrKey: config.auth.jwt.secretOrKey,
    },
    function (jwtToken, done) {
      return done(undefined, jwtToken)
    }
  )
)
