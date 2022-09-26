import _ from 'lodash'
import path from 'path'
import cron from 'node-cron'
import fs from 'fs'
import YAML from 'yaml'
import { logger, sleep } from "@common/utils"
import { EthHelper, tryLock } from "@helpers/index"
import { ETH_ENDPOINT } from '@config/env'
import { Exception } from '@common/exceptions'
import { Code } from '@common/enums'
import { MqttEvents, ContractEvents, ProjectContext, ContractEventHandler } from './interface'
import { Mqtt } from './mqtt'

const privateKeyToAddress = require('ethereum-private-key-to-address')
const ethHelper = new EthHelper(ETH_ENDPOINT)
const web3 = ethHelper.web3

abstract class Project implements ProjectContext {

  listen_lock = false
  useMqtt = false
  useBlockchain = false
  mqtt: Mqtt | null = null
  contractEvents: ContractEvents[] = []
  templateEvents: ContractEventHandler[] = []
  mqttEvents: MqttEvents | null = null
  privatekey: string = ''
  host: string = ''

  abstract getTip(): Promise<number>
  abstract saveTip(to: number): Promise<boolean>

  constructor(public name: string, public handlers: any) {
    this.loadConfig()
  }

  loadConfig() {
    const { name, handlers } = this
    const file = fs.readFileSync(path.join(__dirname, `../../dist/projects/${name}/project.yaml`), 'utf8')
    const c = YAML.parse(file)

    this.useMqtt = c.features.includes('mqtt')
    this.useBlockchain = c.features.includes('blockchain')

    if (this.useBlockchain) {
      const ce = c.dataSources.filter((v: any) => v.kind == 'ethereum/contract')
      const normalCe = ce.filter((v: any) => !_.isNil(v.source.address))
      this.contractEvents = normalCe.map((v: any) => {
        const abi = require(path.join(__dirname, `../../dist/projects/${name}/abis/${v.source.abi}.json`)).abi
        const contract = new web3.eth.Contract(abi, v.source.address)
        const events = v.eventHandlers.map((x: any) => ({
          name: x.event,
          handler: handlers[x.handler]
        }))
        return {
          name: v.name,
          contract,
          events
        }
      })
      const templateCe = ce.filter((v: any) => _.isNil(v.source.address))
      const te: ContractEventHandler[] = []
      templateCe.forEach((v: any) => {
        v.eventHandlers.forEach((x: any) => te.push({ name: x.event, handler: handlers[x.handler] }))
      })
      this.templateEvents = te
    }

    if (this.useMqtt) {
      const me = c.dataSources.find((v: any) => v.kind == 'mqtt')
      this.mqttEvents = {
        topics: me.topics,
        handlers: me.handlers.map((v: any) => ({
          topicReg: new RegExp(v.topicReg),
          handler: handlers[v.handler]
        }))
      }
    }

    this.privatekey = c.host.privatekey
    this.host = privateKeyToAddress(this.privatekey)
  }

  getContract(name: string) {
    return this.contractEvents.find(v => v.name == name)?.contract
  }

  async catchUp() {
    let from = await this.getTip()
    try {
      const last = await web3.eth.getBlockNumber()
  
      logger.info(`catchUp start at: ${from}, end at: ${last}`)
      console.log(`catchUp start at: ${from}, end at: ${last}`)

      from++
      while (from < last) {
        const to = _.min([ from + 10, last ]) || 0
        await this.scanBlocks(from, to)
        from = to + 1
      }
  
      logger.info(`catchUp end at ${from}`)
      console.log(`catchUp end at ${from}`)

    } catch (e) {
      logger.error(e.toString())
    }
  }

  @tryLock('listen_lock')
  async listen() {
    const step = 100
    try {
      const block_id = await this.getTip()
      const blockIndex = block_id + 1
      let id = await web3.eth.getBlockNumber()
      id--
  
      if (id < blockIndex) return
  
      id = _.min([id, blockIndex + step - 1]) || 0
  
      await this.scanBlocks(blockIndex, id)
    } catch (e) {
      logger.error(e.toString())
    }
  }

  async scanBlocks(fromBlock: number, toBlock: number) {
    console.log(`indexing from: ${fromBlock}, to: ${toBlock}`)
    const self = this
    for (let i = 0; i < this.contractEvents.length; i++) {
      const { contract, events: es } = this.contractEvents[i]
      const events = await contract.getPastEvents('allEvents', {
        fromBlock,
        toBlock
      })
/*  
      if (_.size(events) == 0)
        continue
*/
      for (let j = 0; j < events.length; j++) {
        const { transactionHash: hash, event } = events[j]
        const e = _.find(es, v => v.name == event)
        if (!e) continue

        logger.info(`got event ${event}`)
        console.log(`got event ${event}`)
        await e.handler(self, events[j])
      }
    }

    const te = this.templateEvents
    if (te.length > 0) {
      for (let i = 0; i < te.length; i++) {
        const { name, handler } = te[i]
        const events = await web3.eth.getPastLogs({
          fromBlock,
          toBlock,
          topics: [ name ]
        })

        for (let j = 0; j < events.length; j++) {
          await handler(self, events[j])
        }
      }
    }
  
    await this.saveTip(toBlock)
  }

  async startMqtt() {
    if (!this.mqttEvents)
      throw new Exception(Code.BAD_PARAMS, 'mqttEvents undefined')

    const mt = new Mqtt('pebble', this, this.mqttEvents)
    await mt.start()
    return mt
  }

  async startBlockchain() {
    const self = this
    await this.catchUp()
    cron.schedule('*/5 * * * * *', async () => await self.listen(), { timezone: 'Asia/Shanghai' }).start()
  }

  async run() {
    if (this.useMqtt)
      this.mqtt = await this.startMqtt()
    if (this.useBlockchain)
      await this.startBlockchain()
  }
}

export default Project