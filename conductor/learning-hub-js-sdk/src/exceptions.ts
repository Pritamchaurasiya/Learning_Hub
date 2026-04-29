/**
 * Learning Hub SDK Exceptions
 */

export class LearningHubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearningHubError';
  }
}

export class AuthenticationError extends LearningHubError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class APIError extends LearningHubError {
  public status?: number;
  public response?: any;

  constructor(message: string, status?: number, response?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends LearningHubError {
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class ServerError extends APIError {
  constructor(message: string = 'Server error') {
    super(message, 500);
    this.name = 'ServerError';
  }
}
