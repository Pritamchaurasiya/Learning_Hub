import swaggerJSDoc from 'swagger-jsdoc'
import { config } from '../utils/env'

// Load the comprehensive manual OpenAPI spec
import * as fs from 'fs'
import * as path from 'path'

const manualSpecPath = path.resolve(__dirname, '../../docs/OPENAPI_SPEC.json')
let manualSpec: any = {}
try {
  if (fs.existsSync(manualSpecPath)) {
    manualSpec = JSON.parse(fs.readFileSync(manualSpecPath, 'utf-8'))
  }
} catch (e) {
  console.warn('[Swagger] Could not load manual spec, using defaults:', e)
}

const autoOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LearningHub Core Engine API',
      version: '1.0.0',
      description: 'API documentation for the LearningHub backend engine.',
      contact: {
        name: 'LearningHub Support',
        url: 'https://learninghub.com',
        email: 'support@learninghub.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/v1`,
        description: 'Local development server',
      },
      {
        url: `https://api.learninghub.com/api/v1`,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/v1/*.ts', './src/controllers/*.ts'],
}

// Generate auto spec from JSDoc (will be empty without annotations)
const autoSpec = swaggerJSDoc(autoOptions) as any

// Merge manual spec over auto spec (manual takes precedence)
const mergedSpec: any = {
  ...autoSpec,
  ...manualSpec,
  paths: { ...(autoSpec.paths || {}), ...(manualSpec.paths || {}) },
  components: {
    ...(autoSpec.components || {}),
    ...(manualSpec.components || {}),
    schemas: { ...(autoSpec.components?.schemas || {}), ...(manualSpec.components?.schemas || {}) },
    securitySchemes: { ...(autoSpec.components?.securitySchemes || {}), ...(manualSpec.components?.securitySchemes || {}) },
  },
  tags: [...(autoSpec.tags || []), ...(manualSpec.tags || [])].filter((t: any, i: number, arr: any[]) => 
    arr.findIndex(x => x.name === t.name) === i
  ),
}

export const swaggerSpec = mergedSpec
