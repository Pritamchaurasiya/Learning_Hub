import request from 'supertest';
import express from 'express';

// Create a test app with specific routes
export const createTestApp = (routes: express.Router): express.Application => {
  const app = express();
  app.use(express.json());
  app.use(routes);
  return app;
};

// Helper for making authenticated requests
export const authenticatedRequest = (
  app: express.Application,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  token: string,
  body?: any
) => {
  const req = request(app)[method](path).set('Authorization', `Bearer ${token}`);
  if (body) {
    req.send(body);
  }
  return req;
};

// Common response assertions
export const expectSuccess = (response: request.Response) => {
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('success');
};

export const expectError = (response: request.Response, statusCode: number) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.status).toBe('error');
};

export const expectUnauthorized = (response: request.Response) => {
  expectError(response, 401);
};

export const expectForbidden = (response: request.Response) => {
  expectError(response, 403);
};
