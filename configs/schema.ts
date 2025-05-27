import { pgTable, text, integer, serial, timestamp, json,varchar,index, boolean } from 'drizzle-orm/pg-core';
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

export const betaTesters = pgTable('beta_testers', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.clerk_id).notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  company: text('company'),
  role: text('role'),
  accepted: boolean('accepted').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('beta_tester_user_id_idx').on(table.userId),
  emailIdx: index('beta_tester_email_idx').on(table.email)
}));

export const userActivity = pgTable('user_activity', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.clerk_id).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionStart: timestamp('session_start').defaultNow(),
  sessionEnd: timestamp('session_end'),
  lastActive: timestamp('last_active').defaultNow(),
  pageVisits: json('page_visits').$type<{
    path: string;
    timestamp: string;
    duration: number;
  }[]>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('user_activity_user_id_idx').on(table.userId),
  sessionStartIdx: index('user_activity_session_start_idx').on(table.sessionStart)
}));

export const chatsRelations = relations(chats, ({ one }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.clerk_id],
  }),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  user: one(users, {
    fields: [folders.userId],
    references: [users.clerk_id],
  }),
  connections: many(dbConnections),
}));

export const connectionsRelations = relations(dbConnections, ({ one }) => ({
  user: one(users, {
    fields: [dbConnections.userId],
    references: [users.clerk_id],
  }),
  folder: one(folders, {
    fields: [dbConnections.folderId],
    references: [folders.id],
  }),
}));

export const betaTestersRelations = relations(betaTesters, ({ one }) => ({
  user: one(users, {
    fields: [betaTesters.userId],
    references: [users.clerk_id],
  }),
}));
