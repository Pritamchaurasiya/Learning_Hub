import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('CRITICAL: JWT secrets not configured. Set JWT_SECRET and JWT_REFRESH_SECRET environment variables.');
  process.exit(1);
}

if (JWT_SECRET.length < 32 || JWT_REFRESH_SECRET.length < 32) {
  console.error('CRITICAL: JWT secrets must be at least 32 characters long for security.');
  process.exit(1);
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authenticate = (req: any, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, role: string };
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export const generateToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyRefreshToken = (token: string): { userId: string, role: string } => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string, role: string };
};
