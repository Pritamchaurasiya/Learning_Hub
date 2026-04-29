import { z } from 'zod';
import { Client } from '@neondatabase/serverless';
import { generateJWT, hashPassword, verifyPassword, createJSONResponse, createErrorResponse } from '../utils/helpers';
import { verifyToken } from '../middleware/auth';
import { Env } from '../types';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(100)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export async function handleAuth(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // Register
  if (path === '/auth/register' && method === 'POST') {
    return handleRegister(request, env);
  }

  // Login
  if (path === '/auth/login' && method === 'POST') {
    return handleLogin(request, env);
  }

  // Get current user
  if (path === '/auth/me' && method === 'GET') {
    return handleGetMe(request, env);
  }

  // Refresh token
  if (path === '/auth/refresh' && method === 'POST') {
    return handleRefresh(request, env);
  }

  return createErrorResponse('Not found', 404);
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse('Invalid input: ' + result.error.message);
    }

    const { email, password, username } = result.data;

    const client = new Client(env.DATABASE_URL);
    await client.connect();

    // Check if user exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.end();
      return createErrorResponse('User already exists', 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await client.query(
      `INSERT INTO users (email, password_hash, username) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, username, role, xp, level`,
      [email, passwordHash, username]
    );

    const user = newUser.rows[0];

    // Generate JWT
    const token = await generateJWT(
      { userId: user.id, email: user.email, role: user.role },
      env
    );

    await client.end();

    return createJSONResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        xp: user.xp,
        level: user.level
      },
      message: 'User registered successfully'
    }, 201);

  } catch (error) {
    console.error('Register error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse('Invalid input: ' + result.error.message);
    }

    const { email, password } = result.data;

    const client = new Client(env.DATABASE_URL);
    await client.connect();

    // Find user
    const userResult = await client.query(
      `SELECT id, email, username, password_hash, role, xp, level, streak 
       FROM users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      await client.end();
      return createErrorResponse('Invalid credentials', 401);
    }

    const user = userResult.rows[0];

    // Verify password using bcrypt
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      await client.end();
      return createErrorResponse('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Update last active
    await client.query(
      'UPDATE users SET last_active = CURRENT_DATE WHERE id = $1',
      [user.id]
    );

    // Generate JWT
    const token = await generateJWT(
      { userId: user.id, email: user.email, role: user.role },
      env
    );

    await client.end();

    return createJSONResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        xp: user.xp,
        level: user.level,
        streak: user.streak
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

async function handleGetMe(request: Request, env: Env): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Unauthorized', 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token, env.JWT_SECRET);

    if (!payload) {
      return createErrorResponse('Invalid token', 401);
    }

    const client = new Client(env.DATABASE_URL);
    await client.connect();

    const userResult = await client.query(
      `SELECT id, email, username, role, xp, level, streak, created_at 
       FROM users WHERE id = $1`,
      [payload.userId]
    );

    await client.end();

    if (userResult.rows.length === 0) {
      return createErrorResponse('User not found', 404);
    }

    const user = userResult.rows[0];

    return createJSONResponse({ user });

  } catch (error) {
    console.error('GetMe error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

async function handleRefresh(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return createErrorResponse('Token required', 400);
    }

    const payload = await verifyToken(token, env.JWT_SECRET);

    if (!payload) {
      return createErrorResponse('Invalid token', 401);
    }

    // Generate new token
    const newToken = await generateJWT(
      { userId: payload.userId, email: payload.email, role: payload.role },
      env
    );

    return createJSONResponse({ token: newToken });

  } catch (error) {
    console.error('Refresh error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
