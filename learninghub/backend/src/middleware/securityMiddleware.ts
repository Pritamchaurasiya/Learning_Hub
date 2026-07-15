import helmet from 'helmet'
import cors from 'cors'
import hpp from 'hpp'
import { Application } from 'express'
import { corsOptions, helmetConfig } from '../config'

export const configureSecurity = (app: Application) => {
  // Use the helmetConfig from security.ts which already handles production vs development CSP safely
  app.use(helmet(helmetConfig))
  app.use(cors(corsOptions))
  app.use(hpp())
  app.disable('x-powered-by')
  app.disable('server')
}
