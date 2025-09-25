export interface CacheItem<T = any> {
  value: T;
  expiresAt?: number; // Unix timestamp, undefined means no expiration
  createdAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
}

export interface ZenCacheConfig {
  maxMemoryMB?: number;
}

export interface ZenCacheServerConfig {
  port?: number;
  host?: string;
  cacheConfig?: ZenCacheConfig;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsageBytes: number;
  maxMemoryBytes: number;
  memoryUsagePercent: number;
}

export type CacheCommand = 
  | { id: string; type: 'SET'; key: string; value: any; ttl?: number }
  | { id: string; type: 'GET'; key: string }
  | { id: string; type: 'DELETE'; key: string }
  | { id: string; type: 'EXISTS'; key: string }
  | { id: string; type: 'KEYS'; pattern?: string }
  | { id: string; type: 'CLEAR' }
  | { id: string; type: 'STATS' }
  | { id: string; type: 'PING' };

export type CacheSuccessResponse<T = any> = { success: true; data?: T };
export type CacheErrorResponse = { success: false; error: string };
export type CacheResponse<T = any> = CacheSuccessResponse<T> | CacheErrorResponse;
