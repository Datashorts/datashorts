import { Router } from 'express';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DataChatConfig, DataChatInstance, QueryResult, QueryOptions } from './types';

export class DataChat implements DataChatInstance {
  private config: DataChatConfig;
  private client: postgres.Sql | null = null;
  private router: Router;

  constructor(config: DataChatConfig) {
    this.config = config;
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.post('/query', async (req, res) => {
      try {
        const { query, options } = req.body;
        const result = await this.executeQuery(query, options);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  public async connect(): Promise<void> {
    try {
      this.client = postgres(this.config.databaseUrl, {
        max: this.config.options?.maxConnections || 10,
        idle_timeout: this.config.options?.idleTimeoutMillis || 30000,
        connect_timeout: this.config.options?.connectionTimeoutMillis || 10000,
      });
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  public getRouter(): Router {
    return this.router;
  }

  private async executeQuery(
    query: string,
    options: QueryOptions = {}
  ): Promise<QueryResult> {
    if (!this.client) {
      throw new Error('Database connection not established');
    }

    const startTime = Date.now();
    try {
      const result = await this.client.unsafe(query);
      const executionTime = Date.now() - startTime;

      return {
        data: result,
        metadata: {
          rowCount: result.length,
          executionTime,
        },
      };
    } catch (error) {
      return {
        data: [],
        error: error.message,
      };
    }
  }
}

export default DataChat; 