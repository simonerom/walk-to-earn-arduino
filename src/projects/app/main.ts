import { process_init } from '../../common/utils/process_init'
process_init()

import _ from 'lodash'
import { statusRepository } from './models'
import Project from '../project'
import handlers from './handlers'
import { Console } from 'console'
import { PROJECT } from '@config/env';


class App extends Project {

  constructor() {
    super(PROJECT, handlers)
  }

  async getTip() {
    let row = await statusRepository.findByPk(1);
    return (row?.value || 0);
  }
  
  async saveTip(value: number) {
    const [ rows ] = await statusRepository.update({
      value
    }, {
      where: { id: 1 }
    })
    return rows ===  1
  }
}

if (require.main === module) {
  const app = new App()
  app.run()
}