import swaggerJSDoc from 'swagger-jsdoc'
import { config } from '../utils/env'

const options = {
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
  // Paths to files containing OpenAPI definitions
  apis: ['./src/routes/v1/*.ts', './src/controllers/*.ts'],
}

export const swaggerSpec = swaggerJSDoc(options)
