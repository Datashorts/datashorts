// File: configs/schema.ts
import { pgTable, text, integer, serial, timestamp, json, varchar, index, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.clerk_id),
  connectionId: integer('connection_id').references(() => dbConnections.id),
  conversation: json('conversation').notNull().$type<Array<{
    message: string;
    response: string;
    timestamp: string;
    bookmarked?: boolean;
  }>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  clerk_id: text('clerk_id').unique(),
  createdAt: timestamp('created_at').defaultNow()
});

export const folders = pgTable('folders', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.clerk_id).notNull(),
  name: varchar('name', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('folder_user_id_idx').on(table.userId)
}));

export const dbConnections = pgTable('db_connections', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).references(() => users.clerk_id).notNull(),
  folderId: integer('folder_id').references(() => folders.id),
  connectionName: varchar('connection_name', { length: 256 }).notNull(),
  postgresUrl: text('postgres_url'),
  mongoUrl: text('mongo_url'),
  dbType: varchar('db_type', { length: 50 }).notNull(), 
  tableSchema: json('table_schema').notNull(),
  tableData: json('table_data'),     
  pipeline: varchar('pipeline', { length: 50 }).notNull().default('pipeline1'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  folderIdIdx: index('folder_id_idx').on(table.folderId)
}))

export const tableSyncStatus = pgTable('table_sync_status', {
  id: serial('id').primaryKey(),
  connectionId: integer('connection_id').references(() => dbConnections.id).notNull(),
  tableName: varchar('table_name', { length: 256 }).notNull(),
  lastSyncTimestamp: timestamp('last_sync_timestamp').notNull(),
  lastSyncRowCount: integer('last_sync_row_count').notNull(),
  dbType: varchar('db_type', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  connectionTableIdx: index('connection_table_idx').on(table.connectionId, table.tableName)
}));


export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.clerk_id).notNull(),
  planType: varchar('plan_type', { length: 50 }).notNull().default('free'),
  customerId: text('customer_id').notNull(),
  subscriptionId: text('subscription_id').unique().notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  recurringAmount: integer('recurring_amount'),
  currency: varchar('currency', { length: 10 }).default('USD'),
  productId: text('product_id'),
  quantity: integer('quantity').default(1),
  trialPeriodDays: integer('trial_period_days'),
  subscriptionPeriodInterval: varchar('subscription_period_interval', { length: 50 }),
  paymentFrequencyInterval: varchar('payment_frequency_interval', { length: 50 }),
  subscriptionPeriodCount: integer('subscription_period_count'),
  paymentFrequencyCount: integer('payment_frequency_count'),
  nextBillingDate: timestamp('next_billing_date'),
  previousBillingDate: timestamp('previous_billing_date'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const usageLimits = pgTable('usage_limits', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.clerk_id).notNull(),
  chatCount: integer('chat_count').notNull().default(0),
  maxChats: integer('max_chats').notNull().default(20), // 20 for free tier, unlimited for paid
  maxConnections: integer('max_connections').notNull().default(3), // 3 for free tier, unlimited for paid
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});



// Query History table for storing remote query execution history
export const queryHistory = pgTable('query_history', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.clerk_id).notNull(),
  connectionId: integer('connection_id').references(() => dbConnections.id).notNull(),
  chatId: integer('chat_id').references(() => chats.id), // Optional: link to chat conversation
  
  // Query details
  sqlQuery: text('sql_query').notNull(),
  queryType: varchar('query_type', { length: 50 }), // SELECT, INSERT, UPDATE, DELETE, etc.
  
  // Execution results
  success: boolean('success').notNull(),
  executionTime: integer('execution_time'), // in milliseconds
  rowCount: integer('row_count'),
  errorMessage: text('error_message'),
  
  // Result data (for successful queries)
  resultData: json('result_data'), // Store actual query results (limited to first 50-100 rows)
  resultColumns: json('result_columns').$type<string[]>(), // Column names
  
  // Query context
  userIntent: text('user_intent'), // Original user question/intent
  generatedBy: varchar('generated_by', { length: 50 }).default('manual'), // 'manual', 'ai_generated', 'template'
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  
  // Query options used
  validationEnabled: boolean('validation_enabled').default(true),
  optimizationEnabled: boolean('optimization_enabled').default(true),
  forceExecution: boolean('force_execution').default(false),
  
  // Tags and categorization
  tags: json('tags').$type<string[]>(), // Array of strings for categorizing queries
  isFavorite: boolean('is_favorite').default(false),
  isBookmarked: boolean('is_bookmarked').default(false),
  
  // Performance metrics
  validationResult: json('validation_result'), // Store validation warnings/suggestions
  optimizationSuggestion: json('optimization_suggestion'), // Store optimization suggestions
}, (table) => ({
  userConnectionIdx: index('query_history_user_connection_idx').on(table.userId, table.connectionId),
  createdAtIdx: index('query_history_created_at_idx').on(table.createdAt),
  successIdx: index('query_history_success_idx').on(table.success),
  queryTypeIdx: index('query_history_query_type_idx').on(table.queryType),
  bookmarkedIdx: index('query_history_bookmarked_idx').on(table.isBookmarked),
  favoriteIdx: index('query_history_favorite_idx').on(table.isFavorite),
}));

// Relations
export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.clerk_id],
  }),
  connection: one(dbConnections, {
    fields: [chats.connectionId],
    references: [dbConnections.id],
  }),
  queryHistory: many(queryHistory),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  user: one(users, {
    fields: [folders.userId],
    references: [users.clerk_id],
  }),
  connections: many(dbConnections),
}));

export const connectionsRelations = relations(dbConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [dbConnections.userId],
    references: [users.clerk_id],
  }),
  folder: one(folders, {
    fields: [dbConnections.folderId],
    references: [folders.id],
  }),
  chats: many(chats),
  queryHistory: many(queryHistory),
}));



// Query History relations
export const queryHistoryRelations = relations(queryHistory, ({ one }) => ({
  user: one(users, {
    fields: [queryHistory.userId],
    references: [users.clerk_id],
  }),
  connection: one(dbConnections, {
    fields: [queryHistory.connectionId],
    references: [dbConnections.id],
  }),
  // UPDATED: Removed chat relation since there's no foreign key constraint
  // This allows chatId to be any integer (like connection ID) without requiring a chat record
}));



export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.clerk_id],
  }),
}));

export const usageLimitsRelations = relations(usageLimits, ({ one, many }) => ({
  user: one(users, {
    fields: [usageLimits.userId],
    references: [users.clerk_id],
  }),
  connections: many(dbConnections),
}));






