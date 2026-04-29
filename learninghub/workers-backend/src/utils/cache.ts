/**
 * KV Caching Utilities for Cloudflare Workers
 * Provides caching for frequently accessed data to reduce database load
 */

import { Env } from '../types';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  staleWhileRevalidate?: number; // Serve stale data while refreshing
}

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  COURSE_LIST: 300,      // 5 minutes for course listings
  COURSE_DETAIL: 600,    // 10 minutes for individual course details
  USER_ENROLLMENTS: 60,  // 1 minute for user enrollments (changes often)
  USER_PROFILE: 120,     // 2 minutes for user profile
  TEST_LIST: 300,        // 5 minutes for test listings
  TEST_DETAIL: 600,      // 10 minutes for test details
  STATIC_CONTENT: 3600,  // 1 hour for static content
} as const;

/**
 * Generate a cache key with namespace
 */
export function generateCacheKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}

/**
 * Get data from KV cache
 */
export async function getFromCache<T>(
  env: Env,
  key: string
): Promise<T | null> {
  try {
    const cached = await env.LEARNINGHUB_KV?.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    return null;
  } catch (error) {
    console.warn(`Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Store data in KV cache with TTL
 */
export async function setCache<T>(
  env: Env,
  key: string,
  data: T,
  ttl: number
): Promise<void> {
  try {
    await env.LEARNINGHUB_KV?.put(key, JSON.stringify(data), {
      expirationTtl: ttl,
    });
  } catch (error) {
    console.warn(`Cache set error for key ${key}:`, error);
  }
}

/**
 * Delete data from KV cache
 */
export async function deleteCache(
  env: Env,
  key: string
): Promise<void> {
  try {
    await env.LEARNINGHUB_KV?.delete(key);
  } catch (error) {
    console.warn(`Cache delete error for key ${key}:`, error);
  }
}

/**
 * Cache-aside pattern: Get from cache or fetch from source
 */
export async function getOrSetCache<T>(
  env: Env,
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number
): Promise<T> {
  // Try cache first
  const cached = await getFromCache<T>(env, key);
  if (cached !== null) {
    return cached;
  }

  // Fetch from source
  const data = await fetchFn();

  // Store in cache (async, don't wait)
  setCache(env, key, data, ttl).catch(console.warn);

  return data;
}

/**
 * Invalidate cache by pattern (deletes all matching keys)
 * Note: This is a simple implementation. For production, consider using tags.
 */
export async function invalidateCachePattern(
  env: Env,
  prefix: string
): Promise<void> {
  try {
    // List all keys with prefix
    const list = await env.LEARNINGHUB_KV?.list({ prefix });
    if (list) {
      const deletePromises = list.keys.map((key: { name: string }) => 
        env.LEARNINGHUB_KV?.delete(key.name)
      );
      await Promise.all(deletePromises);
    }
  } catch (error) {
    console.warn(`Cache invalidation error for prefix ${prefix}:`, error);
  }
}

/**
 * Cache wrapper for course data
 */
export async function getCachedCourseList(
  env: Env,
  filters: Record<string, string>,
  fetchFn: () => Promise<unknown>
): Promise<unknown> {
  const cacheKey = generateCacheKey(
    'courses',
    `list:${JSON.stringify(filters)}`
  );
  return getOrSetCache(env, cacheKey, fetchFn, CACHE_TTL.COURSE_LIST);
}

/**
 * Cache wrapper for course details
 */
export async function getCachedCourseDetail(
  env: Env,
  courseId: string,
  fetchFn: () => Promise<unknown>
): Promise<unknown> {
  const cacheKey = generateCacheKey('course', courseId);
  return getOrSetCache(env, cacheKey, fetchFn, CACHE_TTL.COURSE_DETAIL);
}

/**
 * Invalidate course-related caches
 */
export async function invalidateCourseCache(
  env: Env,
  courseId?: string
): Promise<void> {
  if (courseId) {
    await deleteCache(env, generateCacheKey('course', courseId));
  }
  // Invalidate list cache
  await invalidateCachePattern(env, 'courses:list');
}

/**
 * Cache wrapper for user enrollments
 */
export async function getCachedUserEnrollments(
  env: Env,
  userId: string,
  fetchFn: () => Promise<unknown>
): Promise<unknown> {
  const cacheKey = generateCacheKey('enrollments', userId);
  return getOrSetCache(env, cacheKey, fetchFn, CACHE_TTL.USER_ENROLLMENTS);
}

/**
 * Invalidate user enrollment cache
 */
export async function invalidateUserEnrollments(
  env: Env,
  userId: string
): Promise<void> {
  await deleteCache(env, generateCacheKey('enrollments', userId));
}
