import Redis from 'ioredis'
import config from '../config'

export const redisClient = new Redis({
  host: config.redis.client,
  port: config.redis.port,
})
