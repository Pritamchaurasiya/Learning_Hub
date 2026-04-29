import { Env } from '../types';
import { RATE_LIMITS, RateLimitType } from '../utils/security';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * KV-based rate limiting middleware for Cloudflare Workers
 * Uses Cloudflare KV for distributed rate limiting
 */
export async function rateLimit(
  request: Request,
  env: Env,
  type: RateLimitType = 'api'
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const config = RATE_LIMITS[type];
  const clientId = getClientIdentifier(request);
  const key = `rate_limit:${type}:${clientId}`;
  
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.window;
  
  try {
    // Get current count from KV
    const stored = await env.LEARNINGHUB_KV?.get(key);
    let entry: RateLimitEntry = stored 
      ? JSON.parse(stored) 
      : { count: 0, resetTime: now + config.window };
    
    // Reset if window has passed
    if (entry.resetTime < now) {
      entry = { count: 0, resetTime: now + config.window };
    }
    
    const allowed = entry.count < config.requests;
    
    if (allowed) {
      entry.count++;
    }
    
    // Store updated count with TTL
    const ttl = entry.resetTime - now;
    await env.LEARNINGHUB_KV?.put(key, JSON.stringify(entry), { expirationTtl: ttl });
    
    const remaining = Math.max(0, config.requests - entry.count);
    const resetTime = entry.resetTime;
    
    return {
      allowed,
      headers: {
        'X-RateLimit-Limit': config.requests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
        ...(allowed ? {} : { 'Retry-After': (resetTime - now).toString() }),
      },
    };
  } catch (error) {
    // Fail open if KV is unavailable, but log the error
    console.error('Rate limiting error:', error);
    return { allowed: true, headers: {} };
  }
}

/**
 * Get client identifier from request
 * Uses CF-Connecting-IP header or falls back to IP
 */
function getClientIdentifier(request: Request): string {
  // Cloudflare provides the real client IP
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp;
  
  // Fallback to other headers (for non-CF environments)
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) return forwarded.split(',')[0].trim();
  
  // Last resort: use a hash of user agent (not ideal but functional)
  const ua = request.headers.get('User-Agent') || 'unknown';
  return `ua:${ua.slice(0, 32)}`;
}

/**
 * Apply rate limiting to a request and return response if limited
 */
export async function applyRateLimit(
  request: Request,
  env: Env,
  type: RateLimitType = 'api'
): Promise<Response | null> {
  const result = await rateLimit(request, env, type);
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${result.headers['Retry-After']} seconds.`,
        retryAfter: parseInt(result.headers['Retry-After'] || '60'),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...result.headers,
        },
      }
    );
  }
  
  return null;
}
