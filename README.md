# ZenCache

A simple, high-performance in-memory caching service similar to Redis or Memcached, built with TypeScript.

## Features

- **In-memory storage** with fast key-value operations
- **TTL (Time To Live)** support for automatic expiration
- **TCP server** for client connections
- **TypeScript client library** for easy usage
- **Statistics tracking** with hit/miss rates
- **Pattern matching** for key searches
- **Automatic cleanup** of expired items

## Installation

### Prerequisites
- Node.js (v18 or higher)
- Yarn package manager

```bash
yarn install
```

## Usage

### Starting the Server

```bash
# Development mode
yarn dev

# Production mode
yarn build
yarn start
```

The server will start on `localhost:6379` by default. You can customize the host and port using environment variables:

```bash
HOST=0.0.0.0 PORT=6380 yarn dev
```

### Using the Client Library

```typescript
import { ZenCacheClient } from './src/client';

async function example() {
  const client = new ZenCacheClient({
    host: 'localhost', // Server host (default: localhost)
    port: 6379,        // Server port (default: 6379)
  });
  
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

## API Reference

### Server Config

The `ZenCacheServer` constructor accepts a configuration object with the following options:

- `port` (number, optional): The port to listen on. Defaults to 6379.
- `host` (string, optional): The host address to bind to. Defaults to 'localhost'.
- `cacheConfig` (object, optional): Configuration options for the underlying cache:
  - `maxMemoryMB` (number, optional): Maximum memory usage in megabytes. Defaults to 10000 (10GB).


### Client Config

The `ZenCacheClient` constructor accepts a configuration object with the following options:

- `port` (number, optional): The port to connect to. Defaults to 6379.
- `host` (string, optional): The host address to connect to. Defaults to 'localhost'.


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


## Examples

See the `examples/` directory for more usage examples:

- `basic-usage.ts`: Basic operations example
- `performance-test.ts`: Performance benchmarking

## Development

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Run in development mode
yarn dev

# Run tests
yarn test
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
