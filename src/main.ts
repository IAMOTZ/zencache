import { ZenCacheServer } from './server';

const PORT = parseInt(process.env.PORT || '6379');
const HOST = process.env.HOST || 'localhost';

const server = new ZenCacheServer({ port: PORT, host: HOST });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down ZenCache server...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down ZenCache server...');
  await server.stop();
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
