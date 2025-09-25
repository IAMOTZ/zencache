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
    this.server = net.createServer(this.onConnection);
    this.server.on('error', this.onServerError);
  }

  /**
   * Handle new client connections
   */
  private onConnection = (socket: net.Socket): void => {
    console.log(`New client connected: ${socket.remoteAddress}:${socket.remotePort}`);

    let buffer = '';

    socket.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();

      let boundary: number;
      while ((boundary = buffer.indexOf('\n')) >= 0) {
        const raw = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        if (!raw) continue;
        this.onData(socket, raw);
      }
    });

    socket.on('close', () => this.onClose(socket));
    socket.on('error', (err: Error) => this.onSocketError(socket, err));

    // Send welcome banner
    this.sendResponse(socket, { success: true, data: 'Welcome to ZenCache!' });
  }

  /**
   * Handle incoming data (JSON messages)
   */
  private onData = (socket: net.Socket, raw: string): void => {
    try {
      const command: CacheCommand = JSON.parse(raw);

      if (!command.id || !command.type) {
        this.sendResponse(socket, {
          success: false,
          error: 'Command must include an id and type',
        });
      }

      const response = this.cache.processCommand(command);
      this.sendResponse(socket, response, command.id);
    } catch (error) {
      this.sendResponse(socket, {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid command',
      });
    }
  }

  /**
   * Handle socket close
   */
  private onClose = (socket: net.Socket): void => {
    console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
  }

  /**
   * Handle per-socket error
   */
  private onSocketError = (socket: net.Socket, error: Error): void => {
    console.error(`Socket error (${socket.remoteAddress}:${socket.remotePort}): ${error.message}`);
  }

  /**
   * Handle server-wide errors
   */
  private onServerError = (error: Error): void => {
    console.error(`Server error: ${error.message}`);
  }

  /**
   * Send JSON response with newline terminator
   */
  private sendResponse(socket: net.Socket, response: CacheResponse, commandId?: string): void {
    socket.write(JSON.stringify({ id: commandId, ...response }) + '\n');
  }

  /**
   * Start the server
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, () => {
        console.log(`ZenCache server running on ${this.host}:${this.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Stop the server
   */
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.cache.shutdown();
        console.log('ZenCache server stopped');
        resolve();
      });
    });
  }
}
