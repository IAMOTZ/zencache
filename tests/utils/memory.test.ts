import { getByteSize, bytesToMB, mbToBytes } from '../../src/utils/memory';

describe('Utils', () => {
  describe('getByteSize', () => {
    it('should calculate size for string values', () => {
      expect(getByteSize('hello')).toBe(5);
      expect(getByteSize('')).toBe(0);
      expect(getByteSize('a'.repeat(100))).toBe(100);
    });

    it('should calculate size for number values', () => {
      expect(getByteSize(42)).toBe(8);
      expect(getByteSize(0)).toBe(8);
      expect(getByteSize(123456789)).toBe(8);
      expect(getByteSize(3.14159)).toBe(8);
    });

    it('should calculate size for boolean values', () => {
      expect(getByteSize(true)).toBe(1);
      expect(getByteSize(false)).toBe(1);
    });

    it('should calculate size for null and undefined', () => {
      expect(getByteSize(null)).toBe(4);
      expect(getByteSize(undefined)).toBe(0);
    });

    it('should calculate size for arrays', () => {
      expect(getByteSize([])).toBe(2);
      expect(getByteSize([1, 2, 3])).toBe(7);
      expect(getByteSize(['a', 'b', 'c'])).toBe(13);
      expect(getByteSize([1, 'hello', true])).toBe(16);
    });

    it('should calculate size for objects', () => {
      expect(getByteSize({})).toBe(2);
      expect(getByteSize({ name: 'John' })).toBe(15);
      expect(getByteSize({ a: 1, b: 2 })).toBe(13);
      expect(getByteSize({
        name: 'John',
        age: 30,
        active: true
      })).toBe(38);
    });


    it('should handle edge cases gracefully', () => {
      // Test with circular reference (should fall back to type-based estimation)
      const circular: any = {};
      circular.self = circular;

      // This should trigger the catch block and use type-based estimation
      const size = getByteSize(circular);
      expect(size).toBe(0); // Unknown type returns 0
    });

    it('should handle functions (fallback to type estimation)', () => {
      const fn = () => 'hello';
      const size = getByteSize(fn);
      expect(size).toBe(0); // Functions can't be serialized, fallback returns 0
    });

    it('should handle symbols (fallback to type estimation)', () => {
      const sym = Symbol('test');
      const size = getByteSize(sym);
      expect(size).toBe(0); // Symbols can't be serialized, fallback returns 0
    });

    // @todo: Add tests for more data types

    describe('performance considerations', () => {
      it('should handle large objects efficiently', () => {
        const largeObject = {
          data: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
            value: Math.random()
          }))
        };

        const start = Date.now();
        const size = getByteSize(largeObject);
        const end = Date.now();

        expect(size).toBeGreaterThan(0);
        expect(end - start).toBeLessThan(100); // Should complete within 100ms
      });
    });
  });

  describe('bytesToMB', () => {
    it('should convert bytes to megabytes correctly', () => {
      expect(bytesToMB(0)).toBe(0);
      expect(bytesToMB(1024)).toBe(0.0009765625);
      expect(bytesToMB(1024 * 1024)).toBe(1);
      expect(bytesToMB(1024 * 1024 * 10)).toBe(10);
    });
  });

  describe('mbToBytes', () => {
    it('should convert megabytes to bytes correctly', () => {
      expect(mbToBytes(0)).toBe(0);
      expect(mbToBytes(1)).toBe(1024 * 1024);
      expect(mbToBytes(10)).toBe(10 * 1024 * 1024);
    });
  });
});
