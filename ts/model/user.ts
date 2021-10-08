import { Document, Schema, Model, model, Error } from 'mongoose'
import bcrypt from 'bcryptjs'
import config from '../config'

export interface IUser extends Document {
  username: string
  password: string
}

export const userSchema: Schema = new Schema({
  username: String,
  password: String,
})

userSchema.pre<IUser>('save', function save(next) {
  const user = this

  bcrypt.genSalt(config.auth.saltrounds, (err: any, salt: any) => {
    if (err) {
      return next(err)
    }
    bcrypt.hash(this.password, salt, (err: Error, hash) => {
      if (err) {
        return next(err)
      }
      user.password = hash
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
