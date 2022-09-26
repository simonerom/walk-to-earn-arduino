import { process_init } from '../../common/utils/process_init'
process_init()

import path from 'path'
import fs from 'fs'
import YAML from 'yaml'
import { db, statusRepository, deviceDataRepository } from './models'

async function main() {
  await db.sync({ force: true })

  const file = fs.readFileSync(path.join(__dirname, `./project.yaml`), 'utf8')
  const c = YAML.parse(file)

  let rows = await statusRepository.findAll();
  let ret = await statusRepository.bulkCreate([
    {
      value: c.startHeight
    },
    {
      value: c.startHeight
    }
  ])
}

main()
.then(() => {
  let rows = statusRepository.findAll().then(rows => {
    console.log("Initialized DB with the following: ",rows[1].value);
    process.exit(0)
  })
})
.catch(e => {
  console.log(e)
});
