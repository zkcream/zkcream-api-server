import server from './app'
import config from './config'

const port: number = config.server.port

server.listen(port, () => console.log('Koa is listening on port %d...', port))
