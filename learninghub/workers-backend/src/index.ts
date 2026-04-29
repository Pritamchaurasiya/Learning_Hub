import { handleAuth } from './routes/auth';
import { handleCourses } from './routes/courses';
import { handleTests } from './routes/tests';
import { handleAI } from './routes/ai';
import { createJSONResponse, createErrorResponse } from './utils/helpers';
import { logger, createRequestContext, logRequestCompletion } from './utils/logger';
import { handleError } from './middleware/error';
import { applyRateLimit } from './middleware/ratelimit';
import { Env, ExecutionContext } from './types';

// Allowed origins for CORS (should come from env in production)
const ALLOWED_ORIGINS = [
  'https://learninghub.app',
  'https://www.learninghub.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

/**
 * Health check with database connectivity test
 */
async function getHealthStatus(env: Env): Promise<Record<string, unknown>> {
  const checks: Record<string, boolean> = {};
  
  // Check database connectivity
  try {
    // Simple query to verify DB is accessible
    await env.DB?.prepare('SELECT 1').first();
    checks.database = true;
  } catch {
    checks.database = false;
  }
  
  const allHealthy = Object.values(checks).every(v => v);
  
  return {
    status: allHealthy ? 'ok' : 'degraded',
    service: 'learninghub-api',
    version: '1.0.0',
    environment: env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString(),
    checks,
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Create request context for logging
    const requestContext = createRequestContext(request);
    logger.setRequestContext(requestContext);
    
    // Get request origin for CORS
    const requestOrigin = request.headers.get('Origin');
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) 
            ? requestOrigin 
            : ALLOWED_ORIGINS[0],
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400'
        }
      });
    }
    
    logger.info('Request started', { path, method: request.method });

    try {
      // Apply rate limiting based on route
      let rateLimitType: 'auth' | 'api' | 'read' | 'ai' = 'api';
      if (path.startsWith('/auth')) rateLimitType = 'auth';
      else if (path.startsWith('/ai')) rateLimitType = 'ai';
      else if (request.method === 'GET') rateLimitType = 'read';
      
      const rateLimitResponse = await applyRateLimit(request, env, rateLimitType);
      if (rateLimitResponse) {
        logRequestCompletion(requestContext, 429);
        return rateLimitResponse;
      }
      
      // Route to appropriate handler
      let response: Response;
      
      // Auth routes
      if (path.startsWith('/auth')) {
        response = await handleAuth(request, env);
      }
      // Course routes
      else if (path.startsWith('/courses')) {
        response = await handleCourses(request, env);
      }
      // Test/Quiz routes
      else if (path.startsWith('/tests')) {
        response = await handleTests(request, env);
      }
      // AI routes
      else if (path.startsWith('/ai')) {
        response = await handleAI(request, env);
      }
      // Health check with DB connectivity
      else if (path === '/health' || path === '/') {
        const healthStatus = await getHealthStatus(env);
        response = createJSONResponse(healthStatus, healthStatus.status === 'ok' ? 200 : 503, ALLOWED_ORIGINS, requestOrigin);
      }
      // Demo data seeding endpoint
      else if (path === '/seed-demo-data' && request.method === 'POST') {
        try {
          const { seedDemoData, demoCredentials } = await import('./utils/demoData');
          await seedDemoData(env);
          response = createJSONResponse({
            success: true,
            message: 'Demo data seeded successfully',
            credentials: demoCredentials
          }, 200, ALLOWED_ORIGINS, requestOrigin);
        } catch (error) {
          logger.error('Demo data seeding failed', error as Error);
          response = createErrorResponse('Failed to seed demo data', 500, 'SEED_ERROR', { 
            details: (error as Error).message 
          });
        }
      }
      // 404 for unknown routes
      else {
        response = createErrorResponse('Not found', 404, 'NOT_FOUND');
      }
      
      logRequestCompletion(requestContext, response.status);
      return response;

    } catch (error) {
      logger.error('Unhandled worker error', error as Error);
      const errorResponse = handleError(error as Error);
      logRequestCompletion(requestContext, errorResponse.status, error as Error);
      return errorResponse;
    }
  }
};
