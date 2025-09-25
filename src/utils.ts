/**
 * Get the memory size of a value in byte
 * @param value - The value to get the byte size of
 * @returns {number} - The byte size of the value
 */
export const getByteSize = (value: any): number => {
  try {
    const serialized = JSON.stringify(value);
    return Buffer.byteLength(serialized, 'utf8');
  } catch (error) {
    // If serialization fails, estimate based on type
    if (typeof value === 'string') {
      return Buffer.byteLength(value, 'utf8');
    } else if (typeof value === 'number') {
      return 8; // 8 bytes for a number
    } else if (typeof value === 'boolean') {
      return 1; // 1 byte for a boolean
    } else {
      console.warn(`Unknown type: ${typeof value}`);
      return 0; // Unknown type, assume 0 bytes
    }
  }
}

/**
 * Convert bytes to megabytes (MB)
 * @param bytes - The number of bytes to convert to MB
 * @returns {number} - The number of MB
 */
export const bytesToMB = (bytes: number): number => {
  return bytes / (1024 * 1024);
}

/**
 * Convert megabytes to bytes
 * @param mb - The number of MB to convert to bytes
 * @returns {number} - The number of bytes
 */
export const mbToBytes = (mb: number): number => {
  return mb * 1024 * 1024;
}
