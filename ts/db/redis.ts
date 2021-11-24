import Redis from 'ioredis'
import config from '../config'

export const redisClient = new Redis({
  port: config.redis.port,
  host: config.redis.host,
})
