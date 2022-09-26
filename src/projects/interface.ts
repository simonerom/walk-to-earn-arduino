import { Contract } from 'web3-eth-contract'
import { Mqtt } from './mqtt'

export interface ProjectContext {
  mqtt: Mqtt | null;
  host: string;
  privatekey: string;
  getContract: (name: string) => Contract | undefined;
}

export interface TopicHandler {
  topicReg: RegExp;
  handler: (context: ProjectContext,topic: string, payload: Buffer) => Promise<void>;
}

export interface MqttEvents {
  topics: string | string[];
  handlers: TopicHandler[];
}

export interface ContractEventHandler {
  name: string;
  handler: (context: ProjectContext, event: any) => Promise<void>;
}

export interface ContractEvents {
  name: string;
  contract: Contract;
  events: ContractEventHandler[];
}