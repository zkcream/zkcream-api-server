import { Document, Schema, Model, model, Error } from 'mongoose'
import bcrypt from 'bcryptjs'
import config from '../config'

export interface IUser extends Document {
  username: string
  password: string
  role: number
}

export const userSchema: Schema = new Schema({
  username: String,
  password: String,
  role: Number,
})

export const enum userType {
  ADMIN = 1,
  USER,
}

userSchema.pre<IUser>('save', function save(next) {
  const user = this

  bcrypt.genSalt(config.auth.saltrounds, (err: any, salt: any) => {
    if (err) {
      return next(err)
    }
    bcrypt.hash(user.password, salt, (err: Error, hash) => {
      if (err) {
        return next(err)
      }
      user.password = hash

      if (!user.role) {
        user.role = userType.USER
      }
      next()
    })
  })
})

userSchema.methods.comparePassword = function (
  candidatePassword: string,
  callback: any
) {
  const self: any = this
  if (self) {
    bcrypt.compare(
      candidatePassword,
      self.password,
      (err: Error, isMatch: boolean) => {
        callback(err, isMatch)
      }
    )
  }
}

export const User: Model<IUser> = model<IUser>('User', userSchema)
