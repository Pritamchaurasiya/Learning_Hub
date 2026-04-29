import { Request, Response, NextFunction } from 'express';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import jwt from 'jsonwebtoken';
import { authenticate, generateToken, generateRefreshToken, verifyRefreshToken } from '../../src/utils/auth';

jest.mock('jsonwebtoken');

describe('AuthMiddleware', () => {
  let mockReq: DeepMockProxy<Request>;
  let mockRes: DeepMockProxy<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = mockDeep<Request>();
    mockRes = mockDeep<Response>();
    mockRes.status = statusMock;
    mockRes.json = jsonMock;
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should call next() with valid token', () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-123', role: 'student' };

      mockReq.header = jest.fn().mockReturnValue(`Bearer ${token}`);
      (jwt.verify as jest.Mock).mockReturnValue(decoded);

      authenticate(mockReq as any, mockRes, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(mockReq.user).toEqual(decoded);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is missing', () => {
      mockReq.header = jest.fn().mockReturnValue(undefined);

      authenticate(mockReq as any, mockRes, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access denied. No token provided.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      const token = 'invalid-token';

      mockReq.header = jest.fn().mockReturnValue(`Bearer ${token}`);
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticate(mockReq as any, mockRes, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid token.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      const token = 'expired-token';

      mockReq.header = jest.fn().mockReturnValue(`Bearer ${token}`);
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Token expired');
      });

      authenticate(mockReq as any, mockRes, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid token.',
      });
    });
  });

  describe('generateToken', () => {
    it('should generate access token with correct payload', () => {
      const userId = 'user-123';
      const role = 'student';
      const expectedToken = 'generated-access-token';

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      const token = generateToken(userId, role);

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId, role },
        expect.any(String),
        { expiresIn: '15m' }
      );
      expect(token).toBe(expectedToken);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with correct payload', () => {
      const userId = 'user-123';
      const role = 'student';
      const expectedToken = 'generated-refresh-token';

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      const token = generateRefreshToken(userId, role);

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId, role },
        expect.any(String),
        { expiresIn: '7d' }
      );
      expect(token).toBe(expectedToken);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and return decoded token payload', () => {
      const token = 'refresh-token';
      const decoded = { userId: 'user-123', role: 'student' };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);

      const result = verifyRefreshToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(result).toEqual(decoded);
    });

    it('should throw error for invalid refresh token', () => {
      const token = 'invalid-refresh-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid refresh token');
      });

      expect(() => verifyRefreshToken(token)).toThrow('Invalid refresh token');
    });
  });
});
