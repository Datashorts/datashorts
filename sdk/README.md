# DataChat SDK

A PostgreSQL database interaction library for Express applications.

## Installation

```bash
npm install datachat-sdk
```

## Usage

```typescript
import express from 'express';
import { DataChat } from 'datachat-sdk';

const app = express();
app.use(express.json());

// Initialize DataChat
const dataChat = new DataChat({
  databaseUrl: 'postgresql://user:password@localhost:5432/database',
  options: {
    maxConnections: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  }
});

// Connect to the database
await dataChat.connect();

// Use the DataChat router
app.use('/api/database', dataChat.getRouter());

// Example query endpoint usage
app.post('/query', async (req, res) => {
  const result = await dataChat.executeQuery('SELECT * FROM users');
  res.json(result);
});

// Don't forget to disconnect when shutting down
process.on('SIGTERM', async () => {
  await dataChat.disconnect();
  process.exit(0);
});

app.listen(3000);
```

## API Reference

### Configuration

```typescript
interface DataChatConfig {
  databaseUrl: string;
  apiKey?: string;
  options?: {
    maxConnections?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };
}
```

### Query Options

```typescript
interface QueryOptions {
  timeout?: number;
  maxRows?: number;
}
```

### Query Result

```typescript
interface QueryResult<T = any> {
  data: T[];
  error?: string;
  metadata?: {
    rowCount: number;
    executionTime: number;
  };
}
```

## License

MIT 