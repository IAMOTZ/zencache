import { ZenCache } from '../src/cache';
import { CacheCommand, CacheErrorResponse, CacheSuccessResponse } from '../src/types';

describe('ZenCache', () => {
  let cache: ZenCache;

  beforeEach(() => {
    cache = new ZenCache();
  });

  afterEach(() => {
    cache.shutdown();
  });

  describe('set', () => {
    it('should set a value without TTL', () => {
      const result = cache.set('key1', 'value1');
      expect(result.success).toBe(true);
    });

    it('should set a value with TTL', () => {
      const result = cache.set('key2', 'value2', { ttl: 1000 });
      expect(result.success).toBe(true);
    });

    it('should handle different data types', () => {
      const stringResult = cache.set('string', 'hello');
      const numberResult = cache.set('number', 42);
      const objectResult = cache.set('object', { name: 'test' });
      const arrayResult = cache.set('array', [1, 2, 3]);

      expect(stringResult.success).toBe(true);
      expect(numberResult.success).toBe(true);
      expect(objectResult.success).toBe(true);
      expect(arrayResult.success).toBe(true);
    });

    it('should overwrite existing values', () => {
      cache.set('key', 'value1');
      cache.set('key', 'value2');

      expect(cache.get('key')).toBe('value2');
    });
  });

  describe('get', () => {
    it('should return null for non-existent key', () => {
      expect(cache.get('non-existent')).toBe(null);
    });

    it('should return value for existing key', () => {
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');
    });

    it('should return null for expired key', async () => {
      cache.set('expired', 'value', { ttl: 100 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.get('expired')).toBe(null);
    });

    it('should return value for non-expired key', async () => {
      cache.set('valid', 'value', { ttl: 1000 });

      // Wait a bit but not enough to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('valid')).toBe('value');
    });

    it('should set/get different data types', () => {
      cache.set('string', 'hello');
      expect(cache.get('string')).toBe('hello');

      cache.set('number', 42);
      expect(cache.get('number')).toBe(42);

      cache.set('boolean', true);
      expect(cache.get('boolean')).toBe(true);

      cache.set('object', { name: 'test' });
      expect(cache.get('object')).toEqual({ name: 'test' });

      cache.set('array', [1, 2, 3]);
      expect(cache.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('delete', () => {
    it('should delete existing key', () => {
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');

      cache.delete('key');
      expect(cache.get('key')).toBe(null);
    });

    it('should handle deleting non-existent key', () => {
      expect(cache.delete('non-existent')).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return false for non-existent key', () => {
      expect(cache.exists('non-existent')).toBe(false);
    });

    it('should return true for existing key', () => {
      cache.set('key', 'value');
      expect(cache.exists('key')).toBe(true);
    });

    it('should return false for expired key', async () => {
      cache.set('expired', 'value', { ttl: 100 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.exists('expired')).toBe(false);
    });
  });

  describe('keys', () => {
    beforeEach(() => {
      cache.set('user:1', 'John');
      cache.set('user:2', 'Jane');
      cache.set('session:abc', 'active');
      cache.set('config:debug', 'true');
    });

    it('should return all keys when no pattern provided', () => {
      const result = cache.keys();
      expect(result).toHaveLength(4);
      expect(result).toEqual(
        expect.arrayContaining(['user:1', 'user:2', 'session:abc', 'config:debug'])
      );
    });

    it('should filter keys with pattern', () => {
      const result = cache.keys('user:*');
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining(['user:1', 'user:2'])
      );
    });

    it('should handle complex patterns', () => {
      const result = cache.keys('*:1');
      expect(result).toHaveLength(1);
      expect(result).toContain('user:1');
    });

    it('should return empty array for non-matching pattern', () => {
      const result = cache.keys('nonexistent:*');
      expect(result).toHaveLength(0);
    });
  });


  describe('clear', () => {
    it('should clear all items', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.keys()).toHaveLength(0);
    });

    it('should reset stat size after clear', () => {
      cache.set('key', 'value');
      cache.get('key'); // This should increment hits
      cache.get('non-existent'); // This should increment misses
      expect(cache.getStats().size).toBe(1);
      cache.clear();
      expect( cache.getStats().size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      const result = cache.getStats();
      expect(result).toEqual(expect.objectContaining({
        size: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        memoryUsageBytes: 0,
        memoryUsagePercent: 0
      }));
    });

    it('should return usage stats', () => {
      cache.set('key', 'value');
      cache.get('key'); // hit
      cache.get('key'); // hit
      cache.get('non-existent'); // miss

      const result = cache.getStats();
      expect(result).toEqual(expect.objectContaining({
        size: 1,
        hits: 2,
        misses: 1,
        hitRate: 2 / 3,
        memoryUsageBytes: expect.any(Number),
        memoryUsagePercent: expect.any(Number)
      }));
      expect(result.memoryUsagePercent).toBeGreaterThan(0);
    });
  });

  describe('processCommand', () => {
    it('should handle SET command', () => {
      const command: CacheCommand = { id: 'test', type: 'SET', key: 'test', value: 'data' };
      const result = cache.processCommand(command);
      expect(result.success).toBe(true);
    });

    it('should handle SET command with TTL', () => {
      const command: CacheCommand = { id: 'test', type: 'SET', key: 'test', value: 'data', ttl: 1000 };
      const result = cache.processCommand(command);
      expect(result.success).toBe(true);
    });

    it('should handle GET command', () => {
      cache.set('test', 'data');
      const command: CacheCommand = { id: 'test', type: 'GET', key: 'test' };
      const result = cache.processCommand(command);
      expect(result.success).toBe(true);
      expect((result as CacheSuccessResponse).data).toBe('data');
    });

    it('should handle DELETE command', () => {
      cache.set('test', 'data');
      const command: CacheCommand = { id: 'test', type: 'DELETE', key: 'test' };
      const result = cache.processCommand(command);
      expect(result.success).toBe(true);
    });

    it('should handle EXISTS command', () => {
      cache.set('test', 'data');
      const command: CacheCommand = { id: 'test', type: 'EXISTS', key: 'test' };
      const result = cache.processCommand(command);
      expect(result.success).toBe(true);
      expect((result as CacheSuccessResponse).data).toBe(true);
    });

    it('should handle KEYS command', () => {
      cache.set('user:1', 'data');
      cache.set('user:2', 'data');
      const command: CacheCommand = { id: 'test', type: 'KEYS', pattern: 'user:*' };
      const result = cache.processCommand(command);
      expect(result.success).toBe(true);
      expect((result as CacheSuccessResponse).data).toEqual(
        expect.arrayContaining(['user:1', 'user:2'])
      );
    });

    it('should handle CLEAR command', () => {
      cache.set('test', 'data');
      const command: CacheCommand = { id: 'test', type: 'CLEAR' };
      const result = cache.processCommand(command);
      expect(result.success).toBe(true);
    });

    it('should handle STATS command', () => {
      const command: CacheCommand = { id: 'test', type: 'STATS' };
      const result = cache.processCommand(command);
      expect(result.success).toBe(true);
      expect((result as CacheSuccessResponse).data).toEqual(expect.objectContaining({
        size: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        memoryUsageBytes: 0,
        memoryUsagePercent: 0
      }));
    });

    it('should handle PING command', () => {
      const command: CacheCommand = { id: 'test', type: 'PING' };
      const result = cache.processCommand(command);
      expect(result.success).toBe(true);
      expect((result as CacheSuccessResponse).data).toBe('PONG');
    });

    it('should handle unknown command', () => {
      const command = { id: 'test', type: 'UNKNOWN' } as any;
      const result = cache.processCommand(command);
      expect(result.success).toBe(false);
      expect((result as CacheErrorResponse).error).toBe('Unknown command');
    });
  });

  describe('TTL and expiration', () => {
    it('should handle items without expiration', async () => {
      cache.set('permanent', 'value');

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('permanent')).toBe('value');
    });

    it('should automatically remove expired items on get', async () => {
      cache.set('expired', 'value', { ttl: 50 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('expired')).toBe(null);
    });

    it('should automatically remove expired items on exists', async () => {
      cache.set('expired', 'value', { ttl: 50 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.exists('expired')).toBe(false);
    });

    it.skip('should automatically cleanup every ZenCache.CLEANUP_INTERVAL', async () => {
      cache.set('expired', 'value', { ttl: ZenCache.CLEANUP_INTERVAL_MS - 10 });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, ZenCache.CLEANUP_INTERVAL_MS));

      expect(cache.get('expired')).toBe(null);
    }, ZenCache.CLEANUP_INTERVAL_MS + 10);
  });

  describe('shutdown', () => {
    it('should clear the store on shutdown', () => {
      cache.set('key', 'value');
      cache.shutdown();

      expect(cache.get('key')).toBe(null);
    });
  });

  describe('memory management', () => {
    it('should use default memory limit when no limit is provided', () => {
      const customCache = new ZenCache({});

      const stats = customCache.getStats();
      expect(stats.maxMemoryBytes).toBe(ZenCache.DEFAULT_MAX_MEMORY_MB * 1024 * 1024);
      
      customCache.shutdown();
    });

    it('should use custom memory limit when provided', () => {
      const customCache = new ZenCache({ maxMemoryMB: 50 });

      const stats = customCache.getStats();
      expect(stats.maxMemoryBytes).toBe(50 * 1024 * 1024);

      customCache.shutdown();
    });

    it('should reject new items when memory limit is reached', () => {
      // Create a cache with very small memory limit
      const smallCache = new ZenCache({ maxMemoryMB: 0.001 }); // 1KB limit
      
      // First item should succeed
      expect(smallCache.set('key1', 'small').success).toBe(true);
      
      // Large item should be rejected
      const largeValue = 'x'.repeat(10000); // 10KB string
      expect(smallCache.set('key2', largeValue).success).toBe(false);
      expect(smallCache.exists('key2')).toBe(false);

      // Should still be able to read existing items
      expect(smallCache.get('key1')).toBe('small');
      
      // Should still be able to delete items
      expect(smallCache.delete('key1')).toBe(true);
      
      smallCache.shutdown();
    });

    it('should update memory usage when items are deleted', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const statsBefore = cache.getStats();
      const initialMemory = statsBefore.memoryUsageBytes;
      
      cache.delete('key1');
      
      const statsAfter = cache.getStats();
      expect(statsAfter.memoryUsageBytes).toBeLessThan(initialMemory);
    });

    it('should reset memory usage when cache is cleared', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const statsBefore = cache.getStats();
      expect(statsBefore.memoryUsageBytes).toBeGreaterThan(0);
      
      cache.clear();
      
      const statsAfter = cache.getStats();
      expect(statsAfter.memoryUsageBytes).toBe(0);
    });

    it('should update memory usage when expired items are cleaned up', async () => {
      cache.set('expired1', 'value1', { ttl: 50 });
      cache.set('expired2', 'value2', { ttl: 50 });
      
      const statsBefore = cache.getStats();
      const initialMemory = statsBefore.memoryUsageBytes;
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Trigger cleanup by trying to get expired items
      cache.get('expired1');
      cache.get('expired2');
      
      const statsAfter = cache.getStats();
      expect(statsAfter.memoryUsageBytes).toBeLessThan(initialMemory);
    });

    it('should maintain accurate memory tracking across operations', () => {
      // Start with empty cache
      let stats = cache.getStats();
      expect(stats.memoryUsageBytes).toBe(0);
      
      // Add items
      cache.set('key1', 'value1');
      cache.set('key2', false);
      
      expect(cache.getStats().memoryUsageBytes).toBe(215);
      
      // Update an item
      cache.set('key1', 10);

      expect(cache.getStats().memoryUsageBytes).toBe(217);
      
      // Delete an item
      cache.delete('key2');
      
      expect(cache.getStats().memoryUsageBytes).toBe(112);
    });

    it('should handle large values', () => {
      const largeValue = 'x'.repeat(10000);
      cache.set('large', largeValue)
      expect(cache.get('large')).toBe(largeValue);
    });

    it('should handle many keys', () => {
      // Set many keys
      for (let i = 0; i < 10000; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      const stats = cache.getStats();
      expect(stats.size).toBe(10000);
    });
  });
});