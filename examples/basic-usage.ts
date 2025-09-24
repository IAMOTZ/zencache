import { ZenCacheClient } from '../src/client';

async function basicUsageExample() {
  const client = new ZenCacheClient('localhost', 6379);

  try {
    // Connect to the server
    await client.connect();
    console.log('Connected to ZenCache server');

    // Ping the server
    const pong = await client.ping();
    console.log('Ping response:', pong);

    // Set some values
    await client.set('user:1', 'John Doe');
    await client.set('user:2', 'Jane Smith');
    await client.set('session:abc123', 'active', 30000); // 30 seconds TTL

    console.log('Set some values');

    // Get values
    const user1 = await client.get('user:1');
    const user2 = await client.get('user:2');
    const session = await client.get('session:abc123');

    console.log('User 1:', user1);
    console.log('User 2:', user2);
    console.log('Session:', session);

    // Check if keys exist
    const user1Exists = await client.exists('user:1');
    const nonExistentExists = await client.exists('user:999');

    console.log('User 1 exists:', user1Exists);
    console.log('Non-existent user exists:', nonExistentExists);

    // Get all keys
    const allKeys = await client.keys();
    console.log('All keys:', allKeys);

    // Get keys with pattern
    const userKeys = await client.keys('user:*');
    console.log('User keys:', userKeys);

    // Get cache statistics
    const stats = await client.stats();
    console.log('Cache stats:', stats);

    // Delete a key
    const deleted = await client.delete('user:2');
    console.log('Deleted user:2:', deleted);

    // Check if it still exists
    const user2Exists = await client.exists('user:2');
    console.log('User 2 still exists:', user2Exists);

    // Wait for session to expire (if TTL is set)
    console.log('Waiting for session to expire...');
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    const sessionAfterExpiry = await client.get('session:abc123');
    console.log('Session after expiry:', sessionAfterExpiry);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Disconnect
    client.disconnect();
    console.log('Disconnected from server');
  }
}

// Run the example
basicUsageExample();
