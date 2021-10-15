import passport from 'koa-passport'
import passportLocal from 'passport-local'
import passportJwt from 'passport-jwt'

import { User } from '../model/user'
import config from '../config'

const LocalStrategy = passportLocal.Strategy
const JwtStrategy = passportJwt.Strategy
const ExtractJwt = passportJwt.ExtractJwt

passport.use(
  new LocalStrategy(
    { usernameField: 'username' },
    (username, password, done) => {
      User.findOne(
        { username: username.toLowerCase() },
        function (err: any, user: any) {
          if (err) {
            return done(err)
          }

          if (!user) {
            return done(null, false, { message: 'username not found' })
          }

          user.comparePassword(password, (err: Error, isMatch: boolean) => {
            if (err) {
              return done(err)
            }

            if (isMatch) {
              return done(undefined, user)
            }
            return done(undefined, false, {
              message: 'invalid username or password.',
            })
          })
        }
      )
    }
  )
)

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.auth.jwt.secretOrKey,
    },
    function (jwtToken, done) {
      User.findOne(
        { username: jwtToken.username },
        function (err: any, user: any) {
          if (err) {
            return done(err, false)
          }

          if (user) {
            return done(undefined, user, jwtToken)
          } else {
            return done(undefined, false)
          }
        }
      )
    }
  )
)
