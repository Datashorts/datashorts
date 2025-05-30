import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "./schema"

if (!process.env.NEXT_PUBLIC_DRIZZLE_DATABASE_URL) {
  throw new Error('NEXT_PUBLIC_DRIZZLE_DATABASE_URL environment variable is not set');
}

const sql = neon("postgresql://karthiknadar1204:Fvph9DyfVm2L@ep-restless-credit-a1c7489o-pooler.ap-southeast-1.aws.neon.tech/datachat?sslmode=require");
export const db = drizzle(sql, { schema });

// const result = await db.select().from(...);