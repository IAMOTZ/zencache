import { ZenCacheClient } from '../src/client';

async function performanceTest() {
  const client = new ZenCacheClient('localhost', 6379);
  const iterations = 1000;

  try {
    await client.connect();
    console.log('Connected to ZenCache server');

    // Test SET performance
    console.log(`Testing SET performance with ${iterations} operations...`);
    const setStart = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await client.set(`key:${i}`, `value:${i}`);
    }
    
    const setEnd = Date.now();
    const setTime = setEnd - setStart;
    console.log(`SET operations: ${iterations} in ${setTime}ms (${(iterations / setTime * 1000).toFixed(2)} ops/sec)`);

    // Test GET performance
    console.log(`Testing GET performance with ${iterations} operations...`);
    const getStart = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await client.get(`key:${i}`);
    }
    
    const getEnd = Date.now();
    const getTime = getEnd - getStart;
    console.log(`GET operations: ${iterations} in ${getTime}ms (${(iterations / getTime * 1000).toFixed(2)} ops/sec)`);

    // Test mixed operations
    console.log(`Testing mixed operations with ${iterations} operations...`);
    const mixedStart = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      if (i % 2 === 0) {
        await client.set(`mixed:${i}`, `data:${i}`);
      } else {
        await client.get(`mixed:${i - 1}`);
      }
    }
    
    const mixedEnd = Date.now();
    const mixedTime = mixedEnd - mixedStart;
    console.log(`Mixed operations: ${iterations} in ${mixedTime}ms (${(iterations / mixedTime * 1000).toFixed(2)} ops/sec)`);

    // Get final statistics
    const stats = await client.stats();
    console.log('Final cache stats:', stats);

    // Cleanup
    await client.clear();
    console.log('Cache cleared');

  } catch (error) {
    console.error('Error during performance test:', error);
  } finally {
    client.disconnect();
    console.log('Disconnected from server');
  }
}

// Run the performance test
performanceTest();
