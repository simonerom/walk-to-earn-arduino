import _ from 'lodash'

const { env } = process;

const get = (name: string, _default: string = '') => {
  return _.get(env, name, _default);
}

const getNumber = (name: string, _default: number = 0) => {
  const n = get(name);
  const num = (!_.isNil(n) && !_.isEmpty(n)) ? _.toNumber(n) : undefined;
  return _.defaultTo(num, _default);
}

export const NODE_ENV = env.NODE_ENV;

export const PROJECT = get('PROJECT', 'app');

export const DB_DIALECT = get('DB_DIALECT', 'postgres');
export const DB_HOST = get('DB_HOST', '127.0.0.1');
export const DB_PORT = getNumber('DB_PORT', 5432);
export const DB_USERNAME = get('DB_USERNAME', 'postgres');
export const DB_PASSWORD = get('DB_PASSWORD', 'admin');
export const DB_NAME = get('DB_NAME', "datalayerdb");

export const SYSLOG_HOST = get('SYSLOGD_HOST');
export const SYSLOG_PORT = getNumber('SYSLOGD_PORT', 514);
export const SYSLOG_PROTOCOL = get('SYSLOGD_PROTOCOL', 'U');
export const SYSLOG_TAG = get('SYSLOGD_TAG', `${PROJECT}`);

export const WORKER_QUEUE = get('WORKER_QUEUE', `${PROJECT}q`);
export const LOG_LEVEL = get('LOG_LEVEL', 'error');
export const DB_LOG = getNumber('DB_LOG', 0) > 0;
export const ETH_ENDPOINT = get('ETH_ENDPOINT');

export const TLS_ENABLED = get('TLS_ENABLED', 'false');
export const TLS_KEY = get('TLS_KEY', 'tls-key.pem');
export const TLS_CERT = get('TLS_CERT', 'tls-cert.pem');
export const CA = get('CA', 'root.pem');
export const MQTT_NODE = get('MQTT_NODE', 'mqtts://localhost');
