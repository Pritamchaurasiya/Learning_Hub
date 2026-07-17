import helmet from 'helmet'
import cors from 'cors'
import hpp from 'hpp'
import { Application } from 'express'
import { corsOptions, helmetConfig } from '../config'

export const configureSecurity = (app: Application) => {
  const scriptSrc = [
    "'self'",
    'https://*.googletagmanager.com',
    ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
  ];

  const styleSrc = [
    "'self'",
    'https://fonts.googleapis.com',
    ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'"] : []),
  ];

  app.use(
    helmet({
      ...helmetConfig,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc,
          styleSrc,
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
