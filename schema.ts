import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const listings = pgTable("listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  city: text("city").notNull(),
  commune: text("commune").notNull(),
  neighborhood: text("neighborhood").notNull(),
  rooms: integer("rooms").notNull(),
  propertyType: text("property_type").notNull(),
  transactionType: text("transaction_type").notNull(),
  price: integer("price").notNull(),
  deposit: integer("deposit"),
  description: text("description").notNull(),
  phone: text("phone").notNull(),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  status: text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").references(() => listings.id),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const phoneUnlocks = pgTable("phone_unlocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull().references(() => listings.id),
  paymentStatus: text("payment_status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  status: true,
  paymentStatus: true,
  featured: true,
  createdAt: true,
}).extend({
  images: z.array(z.string()).min(1, "Au moins une photo est requise"),
  rooms: z.number().min(1, "Le nombre de chambres doit être au moins 1"),
  price: z.number().min(1, "Le prix doit être positif"),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  status: true,
  createdAt: true,
});

export const insertPhoneUnlockSchema = createInsertSchema(phoneUnlocks).omit({
  id: true,
  paymentStatus: true,
  createdAt: true,
});

export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listings.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertPhoneUnlock = z.infer<typeof insertPhoneUnlockSchema>;
export type PhoneUnlock = typeof phoneUnlocks.$inferSelect;
