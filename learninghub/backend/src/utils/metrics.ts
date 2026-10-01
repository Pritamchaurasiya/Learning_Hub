import client from 'prom-client'

// Create a Registry
export const register = new client.Registry()

// Add default metrics (CPU, memory, event loop lag)
client.collectDefaultMetrics({ register })

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
})

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
})

export const activeUsers = new client.Gauge({
  name: 'active_users_total',
  help: 'Number of currently active users',
  registers: [register],
})

export const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
})

export const cacheHitRate = new client.Counter({
  name: 'cache_requests_total',
  help: 'Total number of cache requests',
  labelNames: ['result'],
  registers: [register],
})

export const jobQueueSize = new client.Gauge({
  name: 'job_queue_size',
  help: 'Number of jobs in queue',
  labelNames: ['queue', 'state'],
  registers: [register],
})

export const errorTotal = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type'],
  registers: [register],
})

// Assessment & AI Domain Metrics
export const testSubmissionsTotal = new client.Counter({
  name: 'learninghub_test_submissions_total',
  help: 'Total number of test submissions',
  labelNames: ['status', 'passed'],
  registers: [register],
})

export const testScoreHistogram = new client.Histogram({
  name: 'learninghub_test_score_percentage',
  help: 'Distribution of test completion scores (percentage)',
  buckets: [0, 20, 40, 60, 75, 90, 100],
  registers: [register],
})

export const aiOperationsDuration = new client.Histogram({
  name: 'learninghub_ai_operation_duration_seconds',
  help: 'Duration of AI model calls and operations in seconds',
  labelNames: ['operation', 'provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
})

export const aiOperationsTotal = new client.Counter({
  name: 'learninghub_ai_operations_total',
  help: 'Total number of AI requests',
  labelNames: ['operation', 'status', 'provider'],
  registers: [register],
})
