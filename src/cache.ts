import { 
  CacheItem,
  CacheOptions,
  CacheStats,
  CacheCommand,
  CacheResponse,
  ZenCacheConfig
} from './types';
import { getByteSize, mbToBytes } from './utils/memory';

export class ZenCache {
  private store: Map<string, CacheItem> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private cleanupInterval: NodeJS.Timeout;
  public config: ZenCacheConfig;

  constructor(config: ZenCacheConfig = {}) {
    this.config = ZenCache.getConfigWithDefaults(config);
    // Start cleanup interval to remove expired items
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, ZenCache.CLEANUP_INTERVAL_MS);
  }

  /**
   * Check if a cache item exceeds configured limits
   */
  private wouldExceedMemoryLimit(key: string, value: any): boolean {
    const { maxItemSizeMB, maxItems } = this.config;
    const itemSize = ZenCache.getEstimatedCacheItemSize(key, value);
    if (maxItems && this.store.size >= maxItems) {
      return true;
    }
    if (maxItemSizeMB && itemSize > mbToBytes(maxItemSizeMB)) {
      return true;
    }
    return false;
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, options?: CacheOptions): CacheResponse {
    if (this.wouldExceedMemoryLimit(key, value)) {
      /* @todo: A nice improvement would be to have an option to evict
        oldest items in cache once memory limit is reached.
      */
      return {
        success: false, 
        error: `Item size exceeds configured limit. Cannot add key: ${key}`
      };
    }

    const now = Date.now();
    const expiresAt = options?.ttl ? now + options.ttl : undefined;
    const item: CacheItem<T> = {
      value,
      expiresAt,
      createdAt: now
    };

    this.store.set(key, item);

    return { success: true };
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const item = this.store.get(key);

    if (!item) {
      this.misses++;
      return null;
    }

    // Check if item has expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return item.value as T;
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Check if a key exists in the cache
   */
  exists(key: string): boolean {
    const item = this.store.get(key);

    if (!item) {
      return false;
    }

    // Check if item has expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get all keys matching a pattern (simple wildcard support)
   */
  keys(pattern?: string): string[] {
    const allKeys = Array.from(this.store.keys());

    if (!pattern) {
      return allKeys;
    }

    // Simple wildcard pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Process a cache command
   */
  processCommand(command: CacheCommand): CacheResponse {
    try {
      switch (command.type) {
        case 'GET':
          const value = this.get(command.key);
          return { success: true, data: value };

        case 'SET':
          const result = this.set(command.key, command.value, { ttl: command.ttl });
          return result;

        case 'DELETE':
          const deleted = this.delete(command.key);
          return { success: true, data: deleted };

        case 'EXISTS':
          const exists = this.exists(command.key);
          return { success: true, data: exists };

        case 'KEYS':
          const keys = this.keys(command.pattern);
          return { success: true, data: keys };

        case 'CLEAR':
          this.clear();
          return { success: true, data: true };

        case 'STATS':
          const stats = this.getStats();
          return { success: true, data: stats };

        case 'PING':
          return { success: true, data: 'PONG' };

        default:
          return { success: false, error: 'Unknown command' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clean up expired items
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.store.delete(key)
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      console.info(`Cleaned up ${expiredKeys.length} expired items`);
    }
  }

  /**
   * Shutdown the cache and cleanup resources
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }

  private static getEstimatedCacheItemSize(key: string, value: any): number {
    const keySize = getByteSize(key);
    const valueSize = getByteSize(value);
    return keySize + valueSize;
  }

  public static validateCommand(command: CacheCommand): CacheResponse {
    const { id, type } = command;
    if (typeof id !== 'string' || typeof type !== 'string') {
      return { success: false, error: 'Command must include an id and type' };
    }
    if ('key' in command && (command.key.length < 1 || command.key.length > 5000)) {
      return { success: false, error: 'Key must be between 1 and 5000 characters' };
    }
    if ('ttl' in command && typeof command.ttl !== 'number') {
      return { success: false, error: 'TTL must be a number' };
    }
    return { success: true, data: command as CacheCommand };
  }

  static CLEANUP_INTERVAL_MS = 60000; // Cleanup expired items every minute

  static DEFAULT_MAX_ITEM_SIZE_MB = 1000; // Default max memory of 1GB

  static DEFAULT_MAX_ITEMS = 1000000; // Default max items of 1Million

  static getConfigWithDefaults(config: ZenCacheConfig): ZenCacheConfig {
    return {
      ...config,
      maxItemSizeMB: config.maxItemSizeMB || ZenCache.DEFAULT_MAX_ITEM_SIZE_MB,
      maxItems: config.maxItems || ZenCache.DEFAULT_MAX_ITEMS
    };
  }
}
