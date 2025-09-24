# ZenCache

A simple, high-performance in-memory caching service similar to Redis or Memcached, built with TypeScript.

## Features

- **In-memory storage** with fast key-value operations
- **TTL (Time To Live)** support for automatic expiration
- **TCP server** for client connections
- **Simple text-based protocol** for easy integration
- **TypeScript client library** for easy usage
- **Statistics tracking** with hit/miss rates
- **Pattern matching** for key searches
- **Automatic cleanup** of expired items

## Installation

```bash
npm install
npm run build
```

## Usage

### Starting the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `localhost:6379` by default. You can customize the host and port using environment variables:

```bash
HOST=0.0.0.0 PORT=6380 npm run dev
```

### Using the Client Library

```typescript
import { ZenCacheClient } from './src/client';

async function example() {
  const client = new ZenCacheClient('localhost', 6379);
  
  try {
    // Connect to the server
    await client.connect();
    
    // Set values
    await client.set('user:1', 'John Doe');
    await client.set('session:abc', 'active', 30000); // 30 seconds TTL
    
    // Get values
    const user = await client.get('user:1');
    console.log(user); // 'John Doe'
    
    // Check if key exists
    const exists = await client.exists('user:1');
    console.log(exists); // true
    
    // Get all keys
    const keys = await client.keys();
    console.log(keys); // ['user:1', 'session:abc']
    
    // Get keys with pattern
    const userKeys = await client.keys('user:*');
    console.log(userKeys); // ['user:1']
    
    // Get statistics
    const stats = await client.stats();
    console.log(stats);
    
    // Delete a key
    await client.delete('user:1');
    
    // Clear all keys
    await client.clear();
    
  } finally {
    client.disconnect();
  }
}
```

### Direct TCP Protocol

You can also connect directly using any TCP client (like `telnet` or `nc`):

```bash
# Connect to the server
telnet localhost 6379

# Commands (each command ends with a newline):
SET key value
SET key value 30000  # with TTL in milliseconds
GET key
DELETE key
EXISTS key
KEYS
KEYS user:*
CLEAR
STATS
PING
```

## API Reference

### Client Methods

- `connect()`: Connect to the cache server
- `disconnect()`: Disconnect from the server
- `set(key, value, ttl?)`: Set a key-value pair with optional TTL
- `get(key)`: Get a value by key
- `delete(key)`: Delete a key
- `exists(key)`: Check if a key exists
- `keys(pattern?)`: Get all keys or keys matching a pattern
- `clear()`: Clear all keys
- `stats()`: Get cache statistics
- `ping()`: Ping the server

### Server Commands

- `SET key value [ttl]`: Set a key-value pair
- `GET key`: Get a value by key
- `DELETE key`: Delete a key
- `EXISTS key`: Check if a key exists
- `KEYS [pattern]`: List all keys or keys matching pattern
- `CLEAR`: Clear all keys
- `STATS`: Get cache statistics
- `PING`: Ping the server

## Examples

See the `examples/` directory for more usage examples:

- `basic-usage.ts`: Basic operations example
- `performance-test.ts`: Performance benchmarking

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## Architecture

ZenCache consists of:

1. **Cache Engine** (`src/cache.ts`): Core in-memory storage with TTL support
2. **TCP Server** (`src/server.ts`): Network server handling client connections
3. **Client Library** (`src/client.ts`): TypeScript client for easy integration
4. **Type Definitions** (`src/types.ts`): TypeScript interfaces and types

## Performance

ZenCache is designed for high performance:

- In-memory storage for fast access
- Efficient cleanup of expired items
- Minimal protocol overhead
- Statistics tracking for monitoring

## License

MIT License - see LICENSE file for details.
