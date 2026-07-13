import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // ramp up to 50 users
    { duration: '1m', target: 50 }, // stay at 50 for 1 minute
    { duration: '30s', target: 0 }, // ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'], // less than 1% of requests should fail
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api/v1'

export default function () {
  const endpoints = ['/health', '/tests', '/courses']

  for (const endpoint of endpoints) {
    const res = http.get(`${BASE_URL}${endpoint}`)
    check(res, {
      'status is 200': r => r.status === 200,
    })
    sleep(1)
  }
}
