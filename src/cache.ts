import { CacheItem, CacheOptions, CacheStats, CacheCommand, CacheResponse } from './types';

export class ZenCache {
  private store: Map<string, CacheItem> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start cleanup interval to remove expired items
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, options?: CacheOptions): boolean {
    try {
      const now = Date.now();
      const expiresAt = options?.ttl ? now + options.ttl : undefined;
      
      const item: CacheItem<T> = {
        value,
        expiresAt,
        createdAt: now
      };

      this.store.set(key, item);
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
      this.store.delete(key);
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
      hitRate: total > 0 ? this.hits / total : 0
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

    expiredKeys.forEach(key => this.store.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired items`);
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
}
