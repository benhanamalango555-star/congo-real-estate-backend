import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";
import { type Listing, type InsertListing, listings, type Payment, type InsertPayment, payments, type PhoneUnlock, type InsertPhoneUnlock, phoneUnlocks } from "@shared/schema";

export interface IStorage {
  createListing(listing: InsertListing): Promise<Listing>;
  getListing(id: string): Promise<Listing | undefined>;
  getAllListings(): Promise<Listing[]>;
  getApprovedListings(): Promise<Listing[]>;
  getPendingListings(): Promise<Listing[]>;
  updateListingStatus(id: string, status: string): Promise<Listing | undefined>;
  updateListingPaymentStatus(id: string, paymentStatus: string): Promise<Listing | undefined>;
  approveAllPendingListings(): Promise<number>;
  
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  updatePaymentStatus(id: string, status: string): Promise<Payment | undefined>;
  
  createPhoneUnlock(unlock: InsertPhoneUnlock): Promise<PhoneUnlock>;
  getPhoneUnlock(id: string): Promise<PhoneUnlock | undefined>;
  updatePhoneUnlockStatus(id: string, paymentStatus: string): Promise<PhoneUnlock | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createListing(insertListing: InsertListing): Promise<Listing> {
    const [listing] = await db.insert(listings).values(insertListing).returning();
    return listing;
  }

  async getListing(id: string): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing;
  }

  async getAllListings(): Promise<Listing[]> {
    return await db.select().from(listings).orderBy(desc(listings.createdAt));
  }

  async getApprovedListings(): Promise<Listing[]> {
    return await db.select()
      .from(listings)
      .where(and(
        eq(listings.status, "approved"),
        eq(listings.paymentStatus, "confirmed")
      ))
      .orderBy(desc(listings.createdAt));
  }

  async getPendingListings(): Promise<Listing[]> {
    return await db.select()
      .from(listings)
      .where(eq(listings.status, "pending"))
      .orderBy(desc(listings.createdAt));
  }

  async updateListingStatus(id: string, status: string): Promise<Listing | undefined> {
    const [listing] = await db.update(listings)
      .set({ status })
      .where(eq(listings.id, id))
      .returning();
    return listing;
  }

  async updateListingPaymentStatus(id: string, paymentStatus: string): Promise<Listing | undefined> {
    const [listing] = await db.update(listings)
      .set({ paymentStatus })
      .where(eq(listings.id, id))
      .returning();
    return listing;
  }

  async approveAllPendingListings(): Promise<number> {
    const result = await db.update(listings)
      .set({ status: "approved" })
      .where(and(
        eq(listings.status, "pending"),
        eq(listings.paymentStatus, "confirmed")
      ))
      .returning();
    return result.length;
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async updatePaymentStatus(id: string, status: string): Promise<Payment | undefined> {
    const [payment] = await db.update(payments)
      .set({ status })
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  async createPhoneUnlock(insertUnlock: InsertPhoneUnlock): Promise<PhoneUnlock> {
    const [unlock] = await db.insert(phoneUnlocks).values(insertUnlock).returning();
    return unlock;
  }

  async getPhoneUnlock(id: string): Promise<PhoneUnlock | undefined> {
    const [unlock] = await db.select().from(phoneUnlocks).where(eq(phoneUnlocks.id, id));
    return unlock;
  }

  async updatePhoneUnlockStatus(id: string, paymentStatus: string): Promise<PhoneUnlock | undefined> {
    const [unlock] = await db.update(phoneUnlocks)
      .set({ paymentStatus })
      .where(eq(phoneUnlocks.id, id))
      .returning();
    return unlock;
  }
}

export const storage = new DatabaseStorage();
