CREATE TABLE "chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"connection_id" integer,
	"conversation" json NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "db_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"folder_id" integer,
	"connection_name" varchar(256) NOT NULL,
	"postgres_url" text,
	"mongo_url" text,
	"db_type" varchar(50) NOT NULL,
	"table_schema" json NOT NULL,
	"table_data" json,
	"pipeline" varchar(50) DEFAULT 'pipeline1' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "query_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"connection_id" integer NOT NULL,
	"chat_id" integer,
	"sql_query" text NOT NULL,
	"query_type" varchar(50),
	"success" boolean NOT NULL,
	"execution_time" integer,
	"row_count" integer,
	"error_message" text,
	"result_data" json,
	"result_columns" json,
	"user_intent" text,
	"generated_by" varchar(50) DEFAULT 'manual',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"validation_enabled" boolean DEFAULT true,
	"optimization_enabled" boolean DEFAULT true,
	"force_execution" boolean DEFAULT false,
	"tags" json,
	"is_favorite" boolean DEFAULT false,
	"is_bookmarked" boolean DEFAULT false,
	"validation_result" json,
	"optimization_suggestion" json
);
--> statement-breakpoint
CREATE TABLE "table_sync_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"table_name" varchar(256) NOT NULL,
	"last_sync_timestamp" timestamp NOT NULL,
	"last_sync_row_count" integer NOT NULL,
	"db_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "usage_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chat_count" integer DEFAULT 0 NOT NULL,
	"max_chats" integer DEFAULT 20 NOT NULL,
	"max_connections" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"clerk_id" text,
	"credits" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_clerk_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("clerk_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_connection_id_db_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."db_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_connections" ADD CONSTRAINT "db_connections_user_id_users_clerk_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("clerk_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_connections" ADD CONSTRAINT "db_connections_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_users_clerk_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("clerk_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_history" ADD CONSTRAINT "query_history_user_id_users_clerk_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("clerk_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_history" ADD CONSTRAINT "query_history_connection_id_db_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."db_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_sync_status" ADD CONSTRAINT "table_sync_status_connection_id_db_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."db_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_limits" ADD CONSTRAINT "usage_limits_user_id_users_clerk_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("clerk_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "db_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "folder_id_idx" ON "db_connections" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "folder_user_id_idx" ON "folders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "query_history_user_connection_idx" ON "query_history" USING btree ("user_id","connection_id");--> statement-breakpoint
CREATE INDEX "query_history_created_at_idx" ON "query_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "query_history_success_idx" ON "query_history" USING btree ("success");--> statement-breakpoint
CREATE INDEX "query_history_query_type_idx" ON "query_history" USING btree ("query_type");--> statement-breakpoint
CREATE INDEX "query_history_bookmarked_idx" ON "query_history" USING btree ("is_bookmarked");--> statement-breakpoint
CREATE INDEX "query_history_favorite_idx" ON "query_history" USING btree ("is_favorite");--> statement-breakpoint
CREATE INDEX "query_history_chat_id_idx" ON "query_history" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "connection_table_idx" ON "table_sync_status" USING btree ("connection_id","table_name");