import * as net from 'net';
import { ZenCache } from './cache';
import { CacheCommand, CacheResponse } from './types';

export class ZenCacheServer {
  private server: net.Server;
  private cache: ZenCache;
  private port: number;
  private host: string;

  constructor(port: number = 6379, host: string = 'localhost') {
    this.port = port;
    this.host = host;
    this.cache = new ZenCache();
    this.server = net.createServer();
    this.setupServer();
  }

  private setupServer(): void {
    this.server.on('connection', (socket: net.Socket) => {
      console.log(`New client connected: ${socket.remoteAddress}:${socket.remotePort}`);
      
      let buffer = '';

      socket.on('data', (data: Buffer) => {
        buffer += data.toString();
        
        // Process complete commands (commands end with \n)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            this.processCommand(socket, line.trim());
          }
        }
      });

      socket.on('close', () => {
        console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
      });

      socket.on('error', (error: Error) => {
        console.error(`Socket error: ${error.message}`);
      });

      // Send welcome message
      this.sendResponse(socket, { success: true, data: 'Welcome to ZenCache!' });
    });

    this.server.on('error', (error: Error) => {
      console.error(`Server error: ${error.message}`);
    });
  }

  private processCommand(socket: net.Socket, commandLine: string): void {
    try {
      const command = this.parseCommand(commandLine);
      const response = this.cache.processCommand(command);
      this.sendResponse(socket, response);
    } catch (error) {
      const errorResponse: CacheResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid command format'
      };
      this.sendResponse(socket, errorResponse);
    }
  }

  private parseCommand(commandLine: string): CacheCommand {
    const parts = commandLine.split(' ').filter(part => part.length > 0);
    
    if (parts.length === 0) {
      throw new Error('Empty command');
    }

    const command = parts[0].toUpperCase();

    switch (command) {
      case 'SET':
        if (parts.length < 3) {
          throw new Error('SET requires key and value');
        }
        const ttl = parts.length > 3 ? parseInt(parts[3]) : undefined;
        return {
          type: 'SET',
          key: parts[1],
          value: parts[2],
          ttl
        };

      case 'GET':
        if (parts.length < 2) {
          throw new Error('GET requires a key');
        }
        return {
          type: 'GET',
          key: parts[1]
        };

      case 'DELETE':
        if (parts.length < 2) {
          throw new Error('DELETE requires a key');
        }
        return {
          type: 'DELETE',
          key: parts[1]
        };

      case 'EXISTS':
        if (parts.length < 2) {
          throw new Error('EXISTS requires a key');
        }
        return {
          type: 'EXISTS',
          key: parts[1]
        };

      case 'KEYS':
        return {
          type: 'KEYS',
          pattern: parts.length > 1 ? parts[1] : undefined
        };

      case 'CLEAR':
        return {
          type: 'CLEAR'
        };

      case 'STATS':
        return {
          type: 'STATS'
        };

      case 'PING':
        return {
          type: 'PING'
        };

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  private sendResponse(socket: net.Socket, response: CacheResponse): void {
    const responseStr = JSON.stringify(response) + '\n';
    socket.write(responseStr);
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, () => {
        console.log(`ZenCache server running on ${this.host}:${this.port}`);
        resolve();
      });

      this.server.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.cache.shutdown();
        console.log('ZenCache server stopped');
        resolve();
      });
    });
  }

  public getStats() {
    return this.cache.getStats();
  }
}
