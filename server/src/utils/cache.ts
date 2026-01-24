/**
 * In-Memory Cache Utility
 * 
 * A simple but effective caching layer for frequently accessed data.
 * For production at scale, consider replacing with Redis.
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
  createdAt: number;
}

// In-memory cache store
const cache = new Map<string, CacheEntry<any>>();

// Cache statistics for monitoring
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Cache TTL (Time To Live) in milliseconds
 */
export const CACHE_TTL = {
  DASHBOARD: 5 * 60 * 1000,       // 5 minutes for dashboard stats
  TEAM_PERFORMANCE: 5 * 60 * 1000, // 5 minutes for team performance
  ANALYTICS: 10 * 60 * 1000,      // 10 minutes for analytics
  PUBLIC_CONFIG: 60 * 60 * 1000,  // 1 hour for public config (rarely changes)
  TEAM_MEMBERS: 10 * 60 * 1000,   // 10 minutes for team member lists
  SHORT: 1 * 60 * 1000,           // 1 minute for frequently changing data
  MEDIUM: 5 * 60 * 1000,          // 5 minutes
  LONG: 30 * 60 * 1000,           // 30 minutes
};

/**
 * Cache key prefixes for organization
 */
export const CACHE_KEYS = {
  DASHBOARD_OVERVIEW: 'dashboard:overview',
  DASHBOARD_TEAM_PERFORMANCE: 'dashboard:team-performance',
  DASHBOARD_ANALYTICS: 'dashboard:analytics',
  PUBLIC_CONFIG: 'public:config',
  TEAM_MEMBERS: 'team:members',
  TICKET_LIST: 'tickets:list',
  TICKET_STATS: 'tickets:stats',
  USER_PROFILE: 'user:profile',
};

/**
 * Get data from cache
 * @param key - Cache key
 * @returns Cached data or null if not found/expired
 */
export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  
  if (!entry) {
    cacheMisses++;
    return null;
  }
  
  // Check if expired
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    cacheMisses++;
    return null;
  }
  
  cacheHits++;
  return entry.data as T;
}

/**
 * Set data in cache
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttl - Time to live in milliseconds (default: 5 minutes)
 */
export function cacheSet<T>(key: string, data: T, ttl: number = CACHE_TTL.MEDIUM): void {
  const entry: CacheEntry<T> = {
    data,
    expiry: Date.now() + ttl,
    createdAt: Date.now(),
  };
  
  cache.set(key, entry);
}

/**
 * Delete specific cache entry
 * @param key - Cache key to delete
 */
export function cacheDelete(key: string): boolean {
  return cache.delete(key);
}

/**
 * Delete cache entries matching a pattern
 * @param pattern - Key prefix pattern to match
 */
export function cacheDeletePattern(pattern: string): number {
  let deleted = 0;
  
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
      deleted++;
    }
  }
  
  return deleted;
}

/**
 * Clear all cache entries
 */
export function cacheClear(): void {
  cache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const totalRequests = cacheHits + cacheMisses;
  const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
  
  // Count entries and calculate memory usage
  let totalEntries = 0;
  let expiredEntries = 0;
  const now = Date.now();
  
  for (const [key, entry] of cache.entries()) {
    totalEntries++;
    if (now > entry.expiry) {
      expiredEntries++;
    }
  }
  
  return {
    totalEntries,
    expiredEntries,
    activeEntries: totalEntries - expiredEntries,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: `${hitRate.toFixed(2)}%`,
  };
}

/**
 * Clean up expired cache entries
 * Run periodically to free memory
 */
export function cacheCleanup(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiry) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  return cleaned;
}

/**
 * Cache wrapper function for async operations
 * @param key - Cache key
 * @param ttl - Cache TTL
 * @param fetchFn - Function to fetch data if not cached
 */
export async function cacheWrap<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<{ data: T; fromCache: boolean }> {
  // Try to get from cache
  const cached = cacheGet<T>(key);
  if (cached !== null) {
    return { data: cached, fromCache: true };
  }
  
  // Fetch fresh data
  const data = await fetchFn();
  
  // Store in cache
  cacheSet(key, data, ttl);
  
  return { data, fromCache: false };
}

/**
 * Invalidate caches related to department data
 * Call this when tickets or team data changes
 */
export function invalidateDepartmentCache(department: string): void {
  cacheDeletePattern(`dashboard:overview:${department}`);
  cacheDeletePattern(`dashboard:team-performance:${department}`);
  cacheDeletePattern(`dashboard:analytics:${department}`);
  cacheDeletePattern(`team:members:${department}`);
  cacheDeletePattern(`tickets:list:${department}`);
  cacheDeletePattern(`tickets:stats:${department}`);
}

/**
 * Invalidate all dashboard caches
 */
export function invalidateAllDashboardCaches(): void {
  cacheDeletePattern('dashboard:');
}

// Auto-cleanup expired entries every 10 minutes
setInterval(() => {
  const cleaned = cacheCleanup();
  if (cleaned > 0) {
    console.log(`Cache cleanup: removed ${cleaned} expired entries`);
  }
}, 10 * 60 * 1000);

export default {
  get: cacheGet,
  set: cacheSet,
  delete: cacheDelete,
  deletePattern: cacheDeletePattern,
  clear: cacheClear,
  stats: getCacheStats,
  cleanup: cacheCleanup,
  wrap: cacheWrap,
  invalidateDepartment: invalidateDepartmentCache,
  invalidateAllDashboards: invalidateAllDashboardCaches,
  KEYS: CACHE_KEYS,
  TTL: CACHE_TTL,
};
