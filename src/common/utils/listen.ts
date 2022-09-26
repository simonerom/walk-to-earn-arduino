import os from 'os'
import Koa from 'koa'
import http from 'http'

import { logger } from './logger'
import { handleRouter } from '@helpers/index'
import { logger as reqLogger, cors, body, realIp } from '@middlewares/index'

function listen(project: string, port: number, routers: any[]) {
  const app = new Koa()

  app.keys = ['6fd1de93-812b-4e3a-a4b6-b04d8136a8da']

  app.use(reqLogger())

  app.use(realIp())

  app.use(body())

  app.use(cors())

  app.use(handleRouter(routers).routes())

  const server = http.createServer(app.callback())
  server.keepAliveTimeout = 0
  server.headersTimeout = 0
  server.listen(port, 65535, () => {
    logger.info(`${project} server start, hostname: ${os.hostname()}, port: ${port}`)
    console.log(`${project} server start, hostname: ${os.hostname()}, port: ${port}`)
  })
}

export { listen }