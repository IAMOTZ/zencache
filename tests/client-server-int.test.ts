import { ZenCacheClient } from "../src/client";
import { ZenCacheServer } from "../src/server";

describe('Client-Server Integration', () => {
  let server: ZenCacheServer;
  let client: ZenCacheClient;

  beforeAll(async () => {
    server = new ZenCacheServer({ port: 0, host: 'localhost' });
    client = new ZenCacheClient();
    await server.start();
    await client.connect();
  });
  afterAll(async () => {
    await client.disconnect();
    await server.stop();
  });

  afterEach(async () => {
    await client.clear();
  });

  it('should ping the server', async () => {
    const result = await client.ping();
    expect(result).toBe('PONG');
  });

  it('should set and get a value', async () => {
    await client.set('username', 'John Doe');
    const result = await client.get('username');
    expect(result).toBe('John Doe');
  });

  it('should set and get a value with TTL', async () => {
    await client.set('username', 'John Doe', 1000);
    const result = await client.get('username');
    expect(result).toBe('John Doe');
    await new Promise(resolve => setTimeout(resolve, 1001));
    const resultAfterTTL = await client.get('username');
    expect(resultAfterTTL).toBe(null);
  });

  it('should delete a value', async () => {
    await client.set('username', 'John Doe', 1000);
    const result = await client.get('username');
    expect(result).toBe('John Doe');
    await client.delete('username');
    const resultAfterDelete = await client.get('username');
    expect(resultAfterDelete).toBe(null);
  });

  it('should check if a value exists', async () => {
    await client.set('username', 'John Doe');
    const result = await client.exists('username');
    expect(result).toBe(true);
  });

  it('should get all keys', async () => {
    await client.set('username', 'John Doe');
    await client.set('email', 'john.doe@example.com');
    await client.set('random key', 'random value');
    const result = await client.keys();
    expect(result).toEqual(['username', 'email', 'random key']);
  });

  it('should get keys with pattern', async () => {
    await client.set('user:1', 'John Doe');
    await client.set('user:2', 'john.doe@example.com');
    await client.set('age', 25);
    const result = await client.keys('user:*');
    expect(result).toEqual(['user:1', 'user:2']);
  });

  it('should clear all keys', async () => {
    await client.set('username', 'John Doe');
    await client.set('email', 'john.doe@example.com');
    await client.set('random key', 'random value');
    await client.clear();
    const result = await client.keys();
    expect(result).toEqual([]);
  });
});