module.exports = {
  apps: [
    {
      name: 'learninghub-api',
      script: './dist/server.js',
      instances: 'max', // Scale to all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        // Instruct the JobQueueService NOT to process jobs in the API threads
        // This reserves the API CPU for serving HTTP requests
        WORKER_MODE: 'false',
      },
    },
    {
      name: 'learninghub-ml-worker',
      script: './dist/worker.js',
      instances: 1, // Start with 1 worker process
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        // Instruct the JobQueueService that this is a worker
        WORKER_MODE: 'true',
      },
    },
  ],
}
