import * as net from 'net';
import { randomUUID } from 'crypto';
import { 
  CacheCommand,
  CacheErrorResponse,
  CacheResponse,
  CacheSuccessResponse
} from './types';

export class ZenCacheClient {
  private socket: net.Socket | null = null;
  private host: string;
  private port: number;
  private connected = false;

  private buffer = '';
  private pending = new Map<string, { resolve: (res: CacheSuccessResponse) => void, reject: (err: CacheErrorResponse) => void }>();

  constructor(host: string = 'localhost', port: number = 6379) {
    this.host = host;
    this.port = port;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection({ host: this.host, port: this.port });

      this.socket.on('connect', () => {
        this.connected = true;
        console.info(`Connected to ZenCache server at ${this.host}:${this.port}`);
        resolve();
      });

      this.socket.on('data', (chunk: Buffer) => this.onData(chunk));

      this.socket.on('error', (error: Error) => {
        this.connected = false;
        this.rejectAll(error);
        reject(error);
      });

      this.socket.on('close', () => {
        this.connected = false;
        console.info('Connection to ZenCache server closed');
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
      this.connected = false;
    }
  }

  private onData(chunk: Buffer): void {
    this.buffer += chunk.toString();
    let boundary: number;

    while ((boundary = this.buffer.indexOf('\n')) >= 0) {
      const raw = this.buffer.slice(0, boundary).trim();
      this.buffer = this.buffer.slice(boundary + 1);

      if (!raw) continue;

      try {
        const response: CacheResponse & { id: string } = JSON.parse(raw);
        const entry = this.pending.get(response.id);

        if (entry) {
          this.pending.delete(response.id);
          if (response.success) {
            entry.resolve(response);
          } else {
            entry.reject(response);
          }
        }
      } catch {
        console.error('Invalid JSON response from server:', raw);
      }
    }
  }

  private rejectAll(error: Error) {
    for (const [, entry] of this.pending) {
      entry.reject({ success: false, error: error.message });
    }
    this.pending.clear();
  }

  private async sendCommand(command: CacheCommand): Promise<CacheSuccessResponse> {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      this.pending.set(command.id, { resolve, reject });

      const message = JSON.stringify(command) + '\n';
      this.socket!.write(message);
    });
  }

  // === High-level API ===
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    const res = await this.sendCommand({ id: randomUUID(), type: 'SET', key, value, ttl });
    return res.data;
  }

  async get(key: string): Promise<any> {
    const res = await this.sendCommand({ id: randomUUID(), type: 'GET', key });
    return res.data;
  }

  async delete(key: string): Promise<boolean> {
    const res = await this.sendCommand({ id: randomUUID(), type: 'DELETE', key });
    return res.data;
  }

  async exists(key: string): Promise<boolean> {
    const res = await this.sendCommand({ id: randomUUID(), type: 'EXISTS', key });
    return res.data;
  }

  async keys(pattern?: string): Promise<string[]> {
    const res = await this.sendCommand({ id: randomUUID(), type: 'KEYS', pattern });
    return res.data;
  }

  async clear(): Promise<boolean> {
    const res = await this.sendCommand({ id: randomUUID(), type: 'CLEAR' });
    return res.data;
  }

  async stats(): Promise<any> {
    const res = await this.sendCommand({ id: randomUUID(), type: 'STATS' });
    return res.data;
  }

  async ping(): Promise<string> {
    const res = await this.sendCommand({ id: randomUUID(), type: 'PING' });
    return res.data;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
