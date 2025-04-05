import { Express } from 'express';

export interface DataChatConfig {
  databaseUrl: string;
  apiKey?: string;
  options?: {
    maxConnections?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };
}

export interface DataChatInstance {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getRouter: () => Express.Router;
}

export interface QueryResult<T = any> {
  data: T[];
  error?: string;
  metadata?: {
    rowCount: number;
    executionTime: number;
  };
}

export interface QueryOptions {
  timeout?: number;
  maxRows?: number;
} 