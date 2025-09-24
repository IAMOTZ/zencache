import * as net from 'net';
import { CacheResponse } from './types';

export class ZenCacheClient {
  private socket: net.Socket | null = null;
  private host: string;
  private port: number;
  private connected: boolean = false;

  constructor(host: string = 'localhost', port: number = 6379) {
    this.host = host;
    this.port = port;
  }

  /**
   * Connect to the ZenCache server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      
      this.socket.on('connect', () => {
        this.connected = true;
        console.log(`Connected to ZenCache server at ${this.host}:${this.port}`);
        resolve();
      });

      this.socket.on('error', (error: Error) => {
        this.connected = false;
        reject(error);
      });

      this.socket.on('close', () => {
        this.connected = false;
        console.log('Connection to ZenCache server closed');
      });

      this.socket.connect(this.port, this.host);
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Send a command to the server and get response
   */
  private async sendCommand(command: string): Promise<CacheResponse> {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      let responseData = '';

      const onData = (data: Buffer) => {
        responseData += data.toString();
        
        // Check if we have a complete response (ends with \n)
        if (responseData.includes('\n')) {
          this.socket!.removeListener('data', onData);
          this.socket!.removeListener('error', onError);
          
          try {
            const response = JSON.parse(responseData.trim());
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        }
      };

      const onError = (error: Error) => {
        this.socket!.removeListener('data', onData);
        this.socket!.removeListener('error', onError);
        reject(error);
      };

      this.socket.on('data', onData);
      this.socket.on('error', onError);

      // Send the command
      this.socket.write(command + '\n');
    });
  }

  /**
   * Set a value in the cache
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    const command = ttl ? `SET ${key} ${value} ${ttl}` : `SET ${key} ${value}`;
    const response = await this.sendCommand(command);
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  /**
   * Get a value from the cache
   */
  async get(key: string): Promise<any> {
    const response = await this.sendCommand(`GET ${key}`);
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  /**
   * Delete a key from the cache
   */
  async delete(key: string): Promise<boolean> {
    const response = await this.sendCommand(`DELETE ${key}`);
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  /**
   * Check if a key exists in the cache
   */
  async exists(key: string): Promise<boolean> {
    const response = await this.sendCommand(`EXISTS ${key}`);
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  /**
   * Get all keys (optionally matching a pattern)
   */
  async keys(pattern?: string): Promise<string[]> {
    const command = pattern ? `KEYS ${pattern}` : 'KEYS';
    const response = await this.sendCommand(command);
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  /**
   * Clear all items from the cache
   */
  async clear(): Promise<boolean> {
    const response = await this.sendCommand('CLEAR');
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<any> {
    const response = await this.sendCommand('STATS');
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  /**
   * Ping the server
   */
  async ping(): Promise<string> {
    const response = await this.sendCommand('PING');
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    return response.data;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}
