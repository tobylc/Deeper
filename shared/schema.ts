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
  passwordHash: varchar("password_hash"), // For email/password authentication
  googleId: varchar("google_id"), // Google OAuth ID for account linking
  profileImageUrl: varchar("profile_image_url"),
  phoneNumber: varchar("phone_number"), // For SMS notifications
  phoneVerified: boolean("phone_verified").default(false), // Phone number verification status
  notificationPreference: varchar("notification_preference").default("email"), // email, sms, both
  subscriptionTier: varchar("subscription_tier").default("trial"), // trial, basic, advanced, unlimited
  subscriptionStatus: varchar("subscription_status").default("active"), // active, cancelled, expired, trial_expired
  maxConnections: integer("max_connections").default(1), // connections user can initiate
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  trialStartedAt: timestamp("trial_started_at").defaultNow(), // When 7-day trial began
  trialExpiresAt: timestamp("trial_expires_at"), // When 7-day trial ends
  hasSeenOnboarding: boolean("has_seen_onboarding").default(false), // One-time onboarding popup tracking
  conversationNotificationPrefs: json("conversation_notification_prefs").default('{}'), // Track notification preferences per conversation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  inviterEmail: text("inviter_email").notNull(),
  inviteeEmail: text("invitee_email").notNull(),
  relationshipType: text("relationship_type").notNull(),
  inviterRole: text("inviter_role").notNull(), // e.g., "Father", "Mother", "Friend", "Boyfriend"
  inviteeRole: text("invitee_role").notNull(), // e.g., "Son", "Daughter", "Friend", "Girlfriend"
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
  status: text("status").notNull(), // 'active', 'paused', 'archived'
  title: text("title"), // optional title for the conversation thread
  topic: text("topic"), // topic or subject of this conversation thread
  isMainThread: boolean("is_main_thread").default(true), // first conversation is main thread
  parentConversationId: integer("parent_conversation_id"), // reference to parent conversation if branched
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderEmail: text("sender_email").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // 'question', 'response'
  messageFormat: text("message_format").notNull().default("text"), // 'text', 'voice'
  audioFileUrl: text("audio_file_url"), // URL to stored audio file for voice messages
  transcription: text("transcription"), // AI-generated text from voice message
  audioDuration: integer("audio_duration"), // Duration in seconds
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
export const insertUserSchema = createInsertSchema(users);

export const insertConnectionSchema = createInsertSchema(connections).pick({
  inviterEmail: true,
  inviteeEmail: true,
  relationshipType: true,
  inviterRole: true,
  inviteeRole: true,
  personalMessage: true,
  inviterSubscriptionTier: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  connectionId: true,
  participant1Email: true,
  participant2Email: true,
  relationshipType: true,
  currentTurn: true,
  status: true,
  isMainThread: true,
  parentConversationId: true,
  title: true,
  topic: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  senderEmail: true,
  content: true,
  type: true,
  messageFormat: true,
  audioFileUrl: true,
  transcription: true,
  audioDuration: true,
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

// Verification codes table for production-ready phone verification
export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    code: varchar("code", { length: 10 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    verified: boolean("verified").default(false).notNull(),
  },
  (table) => [
    index("verification_codes_email_phone_idx").on(table.email, table.phoneNumber),
    index("verification_codes_expires_idx").on(table.expiresAt),
  ]
);

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).pick({
  email: true,
  phoneNumber: true,
  code: true,
  expiresAt: true,
  verified: true,
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
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
