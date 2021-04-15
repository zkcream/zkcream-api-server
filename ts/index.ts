import server from './app'
import config from './config'

const port: number = config.get('server.port')

server.listen(port)
