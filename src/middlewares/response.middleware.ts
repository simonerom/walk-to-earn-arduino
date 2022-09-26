import { Context } from 'koa'
import { Code } from '@common/enums'
import { logger } from '@common/utils'

interface Params {
  action: (ctx: Context) => any
}

export function response({ action }: Params) {
  return async (ctx: any) => {
    try {
      const data = await action(ctx);
      ctx.body = data ? { success: true, data } : { success: true }
    } catch (e) {
      const params = JSON.stringify(ctx.params)
      if (e.code) {
        logger.error(`${ctx.path} ${params} ${JSON.stringify(e)}`)
      } else {
        logger.error(`${ctx.path} ${params} \n${e.stack}`)
      }

      ctx.body = {
        success: false,
        error: {
          code: e.code || Code.SERVER_ERROR,
          message: e.code ? e.message : 'server error.'
        },
      }
    }
  }
}