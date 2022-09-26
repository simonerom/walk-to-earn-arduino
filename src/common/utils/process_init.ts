import dotenv from 'dotenv'

function process_init() {
  const ma = require('module-alias/register')
  dotenv.config({ path: '.env' })
}

export { process_init }
