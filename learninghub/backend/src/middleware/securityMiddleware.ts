import helmet from 'helmet'
import cors from 'cors'
import hpp from 'hpp'
import { Application } from 'express'
import { corsOptions, helmetConfig } from '../config'

export const configureSecurity = (app: Application) => {
  app.use(
    helmet({
      ...helmetConfig,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://*.googletagmanager.com',
          ],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          connectSrc: ["'self'", 'https://*.google-analytics.com', 'wss:'],
          frameSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  )
  app.use(cors(corsOptions))
  app.use(hpp())
  app.disable('x-powered-by')
  app.disable('server')
}
