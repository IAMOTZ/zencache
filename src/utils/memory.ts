/**
 * Get the memory size of a value in byte
 */
export const getByteSize = (value: any): number => {
  if (typeof value === 'string') {
    return Buffer.byteLength(value, 'utf8');
  }
  if (typeof value === 'number') {
    return 8; // 8 bytes for a number
  }
  if (typeof value === 'boolean') {
    return 1; // 1 byte for a boolean
  }
  try {
    const serialized = JSON.stringify(value);
    return Buffer.byteLength(serialized, 'utf8');
  } catch (error) {
    console.warn(`Unknown type: ${typeof value}`);
    return 0; // Unknown type, assume 0 bytes
  }
}

/**
 * Convert bytes to megabytes (MB)
 */
export const bytesToMB = (bytes: number): number => {
  return bytes / (1024 * 1024);
}

/**
 * Convert megabytes to bytes
 */
export const mbToBytes = (mb: number): number => {
  return mb * 1024 * 1024;
}
