import { CacheItem, CacheOptions, CacheStats, CacheCommand, CacheResponse, ZenCacheConfig } from './types';
import { bytesToMB, getByteSize, mbToBytes } from './utils';

export class ZenCache {
  private store: Map<string, CacheItem> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private cleanupInterval: NodeJS.Timeout;
  private currentMemoryBytes: number = 0;
  private maxMemoryBytes: number;

  constructor(config: ZenCacheConfig = {}) {
    // Start cleanup interval to remove expired items
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, ZenCache.CLEANUP_INTERVAL_MS);
    this.maxMemoryBytes = mbToBytes(config.maxMemoryMB || ZenCache.DEFAULT_MAX_MEMORY_MB);
  }

  /**
   * Check if adding a new item would exceed memory limit
   */
  private wouldExceedMemoryLimit(key: string, value: any): boolean {
    const keySize = getByteSize(key);
    const valueSize = getByteSize(value);
    const itemSize = keySize + valueSize + 100; // 100byte is a guesstimate Map entry overhead
    return (this.currentMemoryBytes + itemSize) > this.maxMemoryBytes;
  }

  /**
   * Update memory usage when adding/removing items
   */
  private updateMemoryUsage(key: string, value: any, isAdding: boolean): void {
    const keySize = getByteSize(key);
    const valueSize = getByteSize(value);
    const itemSize = keySize + valueSize + 100; // Add overhead for Map entry and CacheItem structure
    if (isAdding) {
      this.currentMemoryBytes += itemSize;
    } else {
      this.currentMemoryBytes = Math.max(0, this.currentMemoryBytes - itemSize);
    }
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, options?: CacheOptions): boolean {
    try {
      if (this.wouldExceedMemoryLimit(key, value)) {
        console.warn(
          `Cache memory limit reached (${bytesToMB(this.maxMemoryBytes)}MB). Cannot add key: ${key}`
        );
        return false;
      }

      const now = Date.now();
      const expiresAt = options?.ttl ? now + options.ttl : undefined;

      // Remove old item if it exists to update memory usage
      const existingItem = this.store.get(key);
      if (existingItem) {
        this.updateMemoryUsage(key, existingItem.value, false);
      }

      const item: CacheItem<T> = {
        value,
        expiresAt,
        createdAt: now
      };

      this.store.set(key, item);
      this.updateMemoryUsage(key, value, true);
      return true;
    } catch (error) {
      console.error('Error setting cache item:', error);
      return false;
    }
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
    const item = this.store.get(key);
    const deleted = this.store.delete(key);

    if (deleted && item) {
      this.updateMemoryUsage(key, item.value, false);
    }

    return deleted;
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
    this.currentMemoryBytes = 0;
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
      maxMemoryBytes: this.maxMemoryBytes,
      memoryUsageBytes: this.currentMemoryBytes,
      memoryUsagePercent: (this.currentMemoryBytes / this.maxMemoryBytes) * 100
    };
  }

  /**
   * Process a cache command
   */
  processCommand(command: CacheCommand): CacheResponse {
    try {
      switch (command.type) {
        case 'SET':
          const success = this.set(command.key, command.value, { ttl: command.ttl });
          if (!success) {
            return { success: false, error: 'Failed to set value' };
          }
          return { success: true, data: success };

        case 'GET':
          const value = this.get(command.key);
          return { success: true, data: value };

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
        expiredKeys.push(key);
      }
    }

    // Remove expired items and update memory usage
    expiredKeys.forEach(key => {
      const item = this.store.get(key);
      if (item) {
        this.updateMemoryUsage(key, item.value, false);
      }
      this.store.delete(key);
    });

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
    this.currentMemoryBytes = 0;
  }

  static CLEANUP_INTERVAL_MS = 60000; // Cleanup expired items every minute

  static DEFAULT_MAX_MEMORY_MB = 10000; // Default max memory of 10GB
}
