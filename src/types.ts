export interface CacheItem<T = any> {
  value: T;
  expiresAt?: number; // Unix timestamp, undefined means no expiration
  createdAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export type CacheCommand = 
  | { type: 'SET'; key: string; value: any; ttl?: number }
  | { type: 'GET'; key: string }
  | { type: 'DELETE'; key: string }
  | { type: 'EXISTS'; key: string }
  | { type: 'KEYS'; pattern?: string }
  | { type: 'CLEAR' }
  | { type: 'STATS' }
  | { type: 'PING' };

export type CacheResponse<T = any> = 
  | { success: true; data?: T }
  | { success: false; error: string };
