import mongoose from 'mongoose'
import config from '../config'

const mongo = () => {
  const connection = mongoose.connection

  connection.on('connected', () => {
    console.log('mongo connection established')
  })

  connection.on('reconnected', () => {
    console.log('mongo connection reestablished')
  })

  connection.on('disconnected', () => {
    console.log('mongo connection disconnected')

    console.log('reconnecting to mongo')
    setTimeout(() => {
      mongoose.connect(config.mongo.uri, {
        autoReconnect: true,
        keepAlive: true,
        socketTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      })
    }, 3000)
  })

  connection.on('close', () => {
    console.log('mongo connection closed')
  })

  connection.on('error', (error: Error) => {
    console.log(`mongo connection error: ${error}"`)
  })

  const run = async () => {
    await mongoose.connect(config.mongo.uri, {
      keepAlive: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
  }

  run().catch((error) => console.error(error))
}

export = mongo()
