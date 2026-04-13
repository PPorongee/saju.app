import { pgTable, text, integer, timestamp, jsonb, serial, varchar } from 'drizzle-orm/pg-core';

// Order table - tracks payments
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderId: varchar('order_id', { length: 64 }).notNull().unique(),
  readingCode: varchar('reading_code', { length: 32 }).notNull().unique(),
  productId: varchar('product_id', { length: 64 }).notNull(),
  amount: integer('amount').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'), // pending, paid, refunded, failed
  paymentKey: varchar('payment_key', { length: 256 }),
  method: varchar('method', { length: 64 }),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Reading table - stores saju readings
export const readings = pgTable('readings', {
  id: serial('id').primaryKey(),
  readingCode: varchar('reading_code', { length: 32 }).notNull().unique(),
  orderId: varchar('order_id', { length: 64 }),
  type: varchar('type', { length: 32 }).notNull(), // saju, compat, pregnancy, yearly
  inputData: jsonb('input_data'), // user birth data, questions, etc.
  chartData: jsonb('chart_data'), // calculated saju pillars, ohaeng, etc.
  resultText: text('result_text'), // AI-generated reading text
  lang: varchar('lang', { length: 5 }).default('ko'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// PaymentEvent table - audit trail
export const paymentEvents = pgTable('payment_events', {
  id: serial('id').primaryKey(),
  orderId: varchar('order_id', { length: 64 }).notNull(),
  eventType: varchar('event_type', { length: 64 }).notNull(), // confirm_request, confirm_success, confirm_fail, refund_request, refund_success
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
