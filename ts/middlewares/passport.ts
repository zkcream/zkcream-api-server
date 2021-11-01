import passport from 'koa-passport'
import passportJwt from 'passport-jwt'
import passportLocal from 'passport-local'

import config from '../config'
import { extractTokenFromCookie } from '../controller/utils'
import { ethers } from 'ethers'
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
      const address = username
      const signature = password
      const msg = ETH_SIG_PREFIX + String(DATA_TO_SIGN.length) + DATA_TO_SIGN
      const msgHash = ethers.utils.hashMessage(msg)

      if (signature != null) {
        const addressRecovered = ethers.utils.verifyMessage(msgHash, signature)
        if (
          address.toLocaleLowerCase() == addressRecovered.toLocaleLowerCase()
        ) {
          return done(undefined, true)
        } else {
          return done(undefined, false)
        }
      }
    }
  )
)

const cookieExtractor = function (req) {
  return extractTokenFromCookie(req.headers.cookie)
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
