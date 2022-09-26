import _ from 'lodash'
import fs from 'fs'
import { connectAsync, AsyncClient } from 'async-mqtt'
import { logger } from '@common/utils'
import { MqttEvents, ProjectContext } from './interface'
import { TLS_KEY, TLS_CERT, CA, MQTT_NODE, TLS_ENABLED } from '@config/env'



export async function createClient() {
  let config = {}
  if (TLS_ENABLED === 'true' || TLS_ENABLED === 'True') {
    const key = fs.readFileSync(TLS_KEY)
    const cert = fs.readFileSync(TLS_CERT)
    const ca = fs.readFileSync(CA)
    config = {
      key,
      cert,
      ca,
      rejectUnauthorized: true
    }
  }
  try {
    const client = await connectAsync(MQTT_NODE, config)
    return client
  } catch (e) {
    console.log("Failed to connect to MQTT broker")
    logger.error(e.toString())
    return undefined
  }
}

export class Mqtt {

  private client: AsyncClient | undefined

  constructor(public module: string, public context: ProjectContext, public config: MqttEvents) {}

  public async start() {
    const { context } = this
    const { topics, handlers } = this.config
    const client = this.client = await createClient()
    if (!client)
      return false

    client.on('message', async (topic, payload) => {
      try {
        logger.info(`topic: ${topic}`)
        const topicHandler = _.find(handlers, v => v.topicReg.test(topic))
        if (topicHandler) {
          await topicHandler.handler(context, topic, payload)
        }
      } catch (e) {
        console.log(e.toString())
      }
    })

    try {
      await client.subscribe(topics, { qos: 0 })
    } catch (e) {
      logger.error(e.toString())
      return false
    }

    return true
  }

  public async publish(topic: string, data: any) {
    if (typeof(data) == 'object')
      data = JSON.stringify(data)

    try {
      await this.client?.publish(topic, data)
    } catch (e) {
      logger.error(e.toString())
    }
  }
}