import { relations } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, customType } from 'drizzle-orm/pg-core';

export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  }
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const memories = pgTable('memories', {
  id: serial('id').primaryKey(),
  userId: text('user_uid').references(() => users.uid).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding'),
  source: text('source'), // e.g. "Google Docs", "Google Chat", "Direct Input"
  createdAt: timestamp('created_at').defaultNow(),
});

