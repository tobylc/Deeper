import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (compatible with Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  subscriptionTier: varchar("subscription_tier").default("free"), // free, starter, pro, unlimited
  subscriptionStatus: varchar("subscription_status").default("active"), // active, cancelled, expired
  maxConnections: integer("max_connections").default(1), // connections user can initiate
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  inviterEmail: text("inviter_email").notNull(),
  inviteeEmail: text("invitee_email").notNull(),
  relationshipType: text("relationship_type").notNull(),
  status: text("status").notNull(), // 'pending', 'accepted', 'declined'
  personalMessage: text("personal_message"),
  inviterSubscriptionTier: text("inviter_subscription_tier").default("free"), // tier when invitation was sent
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull(),
  participant1Email: text("participant1_email").notNull(),
  participant2Email: text("participant2_email").notNull(),
  relationshipType: text("relationship_type").notNull(),
  currentTurn: text("current_turn").notNull(), // email of who should ask next question
  status: text("status").notNull(), // 'active', 'paused'
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderEmail: text("sender_email").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // 'question', 'response'
  createdAt: timestamp("created_at").defaultNow(),
});

export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  toEmail: text("to_email").notNull(),
  fromEmail: text("from_email").notNull(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content").notNull(),
  emailType: text("email_type").notNull(), // "invitation", "acceptance", "decline"
  status: text("status").notNull().default("sent"), // "sent", "delivered", "failed"
  connectionId: integer("connection_id").references(() => connections.id),
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertConnectionSchema = createInsertSchema(connections).pick({
  inviterEmail: true,
  inviteeEmail: true,
  relationshipType: true,
  personalMessage: true,
}).extend({
  personalMessage: z.string().optional(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  connectionId: true,
  participant1Email: true,
  participant2Email: true,
  relationshipType: true,
  currentTurn: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  senderEmail: true,
  content: true,
  type: true,
});

export const insertEmailSchema = createInsertSchema(emails).pick({
  toEmail: true,
  fromEmail: true,
  subject: true,
  htmlContent: true,
  textContent: true,
  emailType: true,
  connectionId: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
