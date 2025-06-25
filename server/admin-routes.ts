import type { Express } from "express";
import { storage } from "./storage";
import { finalDb } from "./db-final";
import { users, connections, conversations, messages, emails } from "@shared/schema";
import { desc, count, sql, eq, and, gte, lte, isNotNull } from "drizzle-orm";
import { rateLimit } from "./middleware";
import { z } from "zod";

// Admin authentication middleware
const isAdmin = (req: any, res: any, next: any) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
  
  if (!req.user || !adminEmails.includes(req.user.email)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

export function setupAdminRoutes(app: Express) {
  console.log('[ADMIN] Setting up admin routes...');

  // Admin dashboard stats
  app.get('/api/admin/stats', rateLimit(60, 100), isAdmin, async (req, res) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // User stats
      const totalUsers = await finalDb.select({ count: count() }).from(users);
      const activeUsers = await finalDb.select({ count: count() }).from(users)
        .where(gte(users.updatedAt, thirtyDaysAgo));
      const newUsersToday = await finalDb.select({ count: count() }).from(users)
        .where(gte(users.createdAt, oneDayAgo));
      const newUsersWeek = await finalDb.select({ count: count() }).from(users)
        .where(gte(users.createdAt, sevenDaysAgo));
      
      // Subscription stats
      const subscriptionStats = await finalDb.select({
        tier: users.subscriptionTier,
        count: count()
      }).from(users).groupBy(users.subscriptionTier);

      // Connection stats
      const totalConnections = await finalDb.select({ count: count() }).from(connections);
      const acceptedConnections = await finalDb.select({ count: count() }).from(connections)
        .where(eq(connections.status, 'accepted'));
      const pendingConnections = await finalDb.select({ count: count() }).from(connections)
        .where(eq(connections.status, 'pending'));

      // Conversation stats
      const totalConversations = await finalDb.select({ count: count() }).from(conversations);
      const activeConversations = await finalDb.select({ count: count() }).from(conversations)
        .where(and(eq(conversations.status, 'active'), gte(conversations.lastActivityAt, sevenDaysAgo)));

      // Message stats
      const totalMessages = await finalDb.select({ count: count() }).from(messages);
      const messagesWeek = await finalDb.select({ count: count() }).from(messages)
        .where(gte(messages.createdAt, sevenDaysAgo));
      const messagesDay = await finalDb.select({ count: count() }).from(messages)
        .where(gte(messages.createdAt, oneDayAgo));

      // Voice vs text message ratio
      const messageTypeStats = await finalDb.select({
        format: messages.messageFormat,
        count: count()
      }).from(messages).groupBy(messages.messageFormat);

      // Email stats
      const emailStats = await finalDb.select({
        type: emails.emailType,
        count: count()
      }).from(emails).groupBy(emails.emailType);

      // User engagement metrics
      const userEngagement = await finalDb.execute(sql`
        SELECT 
          u.subscription_tier,
          COUNT(DISTINCT u.id) as user_count,
          AVG(user_messages.message_count) as avg_messages_per_user,
          AVG(user_conversations.conversation_count) as avg_conversations_per_user
        FROM users u
        LEFT JOIN (
          SELECT sender_email, COUNT(*) as message_count
          FROM messages
          GROUP BY sender_email
        ) user_messages ON u.email = user_messages.sender_email
        LEFT JOIN (
          SELECT participant1_email as email, COUNT(*) as conversation_count
          FROM conversations
          GROUP BY participant1_email
          UNION ALL
          SELECT participant2_email as email, COUNT(*) as conversation_count
          FROM conversations
          GROUP BY participant2_email
        ) user_conversations ON u.email = user_conversations.email
        GROUP BY u.subscription_tier
      `);

      res.json({
        users: {
          total: totalUsers[0].count,
          active: activeUsers[0].count,
          newToday: newUsersToday[0].count,
          newThisWeek: newUsersWeek[0].count,
          subscriptionBreakdown: subscriptionStats,
          engagement: userEngagement.rows
        },
        connections: {
          total: totalConnections[0].count,
          accepted: acceptedConnections[0].count,
          pending: pendingConnections[0].count,
          acceptanceRate: totalConnections[0].count > 0 ? 
            (acceptedConnections[0].count / totalConnections[0].count * 100).toFixed(1) : '0'
        },
        conversations: {
          total: totalConversations[0].count,
          active: activeConversations[0].count
        },
        messages: {
          total: totalMessages[0].count,
          thisWeek: messagesWeek[0].count,
          today: messagesDay[0].count,
          typeBreakdown: messageTypeStats
        },
        emails: {
          typeBreakdown: emailStats
        }
      });
    } catch (error) {
      console.error('[ADMIN] Stats error:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Daily activity chart data
  app.get('/api/admin/activity-chart', rateLimit(60, 50), isAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const dailyStats = await finalDb.execute(sql`
        WITH date_series AS (
          SELECT generate_series(
            ${startDate.toISOString().split('T')[0]}::date,
            CURRENT_DATE,
            '1 day'::interval
          )::date as date
        ),
        daily_users AS (
          SELECT DATE(created_at) as date, COUNT(*) as new_users
          FROM users
          WHERE created_at >= ${startDate.toISOString()}
          GROUP BY DATE(created_at)
        ),
        daily_messages AS (
          SELECT DATE(created_at) as date, COUNT(*) as messages
          FROM messages
          WHERE created_at >= ${startDate.toISOString()}
          GROUP BY DATE(created_at)
        ),
        daily_connections AS (
          SELECT DATE(created_at) as date, COUNT(*) as connections
          FROM connections
          WHERE created_at >= ${startDate.toISOString()}
          GROUP BY DATE(created_at)
        )
        SELECT 
          ds.date,
          COALESCE(du.new_users, 0) as new_users,
          COALESCE(dm.messages, 0) as messages,
          COALESCE(dc.connections, 0) as connections
        FROM date_series ds
        LEFT JOIN daily_users du ON ds.date = du.date
        LEFT JOIN daily_messages dm ON ds.date = dm.date
        LEFT JOIN daily_connections dc ON ds.date = dc.date
        ORDER BY ds.date
      `);

      res.json(dailyStats.rows);
    } catch (error) {
      console.error('[ADMIN] Activity chart error:', error);
      res.status(500).json({ error: 'Failed to fetch activity data' });
    }
  });

  // User management - list with pagination and search
  app.get('/api/admin/users', rateLimit(60, 100), isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string || '';
      const offset = (page - 1) * limit;

      let query = finalDb.select().from(users);
      
      if (search) {
        query = query.where(sql`
          ${users.email} ILIKE ${`%${search}%`} OR 
          ${users.firstName} ILIKE ${`%${search}%`} OR 
          ${users.lastName} ILIKE ${`%${search}%`}
        `);
      }

      const userList = await query
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      const totalCount = await finalDb.select({ count: count() }).from(users);

      res.json({
        users: userList,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages: Math.ceil(totalCount[0].count / limit)
        }
      });
    } catch (error) {
      console.error('[ADMIN] Users list error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // User details with related data
  app.get('/api/admin/users/:userId', rateLimit(60, 100), isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await finalDb.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's connections
      const userConnections = await finalDb.select().from(connections)
        .where(sql`${connections.inviterEmail} = ${user[0].email} OR ${connections.inviteeEmail} = ${user[0].email}`)
        .orderBy(desc(connections.createdAt));

      // Get user's conversations
      const userConversations = await finalDb.select().from(conversations)
        .where(sql`${conversations.participant1Email} = ${user[0].email} OR ${conversations.participant2Email} = ${user[0].email}`)
        .orderBy(desc(conversations.lastActivityAt));

      // Get user's messages
      const userMessages = await finalDb.select().from(messages)
        .where(eq(messages.senderEmail, user[0].email))
        .orderBy(desc(messages.createdAt))
        .limit(50);

      res.json({
        user: user[0],
        connections: userConnections,
        conversations: userConversations,
        messages: userMessages
      });
    } catch (error) {
      console.error('[ADMIN] User details error:', error);
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  });

  // Update user subscription
  app.patch('/api/admin/users/:userId/subscription', rateLimit(60, 20), isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { subscriptionTier, subscriptionStatus, maxConnections } = req.body;

      const tierLimits = {
        trial: 1,
        basic: 1,
        advanced: 3,
        unlimited: 999
      };

      const updateData: any = {};
      if (subscriptionTier) {
        updateData.subscriptionTier = subscriptionTier;
        updateData.maxConnections = tierLimits[subscriptionTier as keyof typeof tierLimits] || 1;
      }
      if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;
      if (maxConnections !== undefined) updateData.maxConnections = maxConnections;

      await storage.updateUser(userId, updateData);

      res.json({ success: true });
    } catch (error) {
      console.error('[ADMIN] Update subscription error:', error);
      res.status(500).json({ error: 'Failed to update subscription' });
    }
  });

  // Connection management
  app.get('/api/admin/connections', rateLimit(60, 100), isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const offset = (page - 1) * limit;

      let query = finalDb.select().from(connections);
      
      if (status) {
        query = query.where(eq(connections.status, status));
      }

      const connectionList = await query
        .orderBy(desc(connections.createdAt))
        .limit(limit)
        .offset(offset);

      const totalCount = await finalDb.select({ count: count() }).from(connections);

      res.json({
        connections: connectionList,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages: Math.ceil(totalCount[0].count / limit)
        }
      });
    } catch (error) {
      console.error('[ADMIN] Connections list error:', error);
      res.status(500).json({ error: 'Failed to fetch connections' });
    }
  });

  // Message management with conversation context
  app.get('/api/admin/messages', rateLimit(60, 100), isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const messageList = await finalDb.execute(sql`
        SELECT 
          m.*,
          c.participant1_email,
          c.participant2_email,
          c.relationship_type,
          c.title as conversation_title
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      const totalCount = await finalDb.select({ count: count() }).from(messages);

      res.json({
        messages: messageList.rows,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages: Math.ceil(totalCount[0].count / limit)
        }
      });
    } catch (error) {
      console.error('[ADMIN] Messages list error:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // System health and performance metrics
  app.get('/api/admin/system-health', rateLimit(60, 30), isAdmin, async (req, res) => {
    try {
      // Database connection test
      const dbTest = await finalDb.execute(sql`SELECT 1 as test`);
      const dbHealthy = dbTest.rows.length > 0;

      // Get database size and table stats
      const tableStats = await finalDb.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `);

      // Get recent error patterns from logs (if implemented)
      const recentErrors = await finalDb.execute(sql`
        SELECT 
          COUNT(*) as error_count,
          'recent_period' as timeframe
        FROM emails 
        WHERE status = 'failed' 
        AND sent_at >= NOW() - INTERVAL '24 hours'
      `);

      res.json({
        database: {
          healthy: dbHealthy,
          tables: tableStats.rows
        },
        errors: {
          recentEmailFailures: recentErrors.rows[0]?.error_count || 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[ADMIN] System health error:', error);
      res.status(500).json({ error: 'Failed to check system health' });
    }
  });

  // Advanced analytics - user retention and engagement
  app.get('/api/admin/analytics/retention', rateLimit(60, 20), isAdmin, async (req, res) => {
    try {
      const retentionData = await finalDb.execute(sql`
        WITH user_cohorts AS (
          SELECT 
            DATE_TRUNC('week', created_at) as cohort_week,
            id,
            email,
            created_at
          FROM users
          WHERE created_at >= NOW() - INTERVAL '12 weeks'
        ),
        user_activity AS (
          SELECT 
            sender_email,
            DATE_TRUNC('week', created_at) as activity_week
          FROM messages
          GROUP BY sender_email, DATE_TRUNC('week', created_at)
        )
        SELECT 
          uc.cohort_week,
          COUNT(DISTINCT uc.id) as cohort_size,
          COUNT(DISTINCT CASE 
            WHEN ua.activity_week = uc.cohort_week + INTERVAL '1 week' 
            THEN uc.email 
          END) as week_1_retained,
          COUNT(DISTINCT CASE 
            WHEN ua.activity_week = uc.cohort_week + INTERVAL '2 weeks' 
            THEN uc.email 
          END) as week_2_retained,
          COUNT(DISTINCT CASE 
            WHEN ua.activity_week = uc.cohort_week + INTERVAL '4 weeks' 
            THEN uc.email 
          END) as week_4_retained
        FROM user_cohorts uc
        LEFT JOIN user_activity ua ON uc.email = ua.sender_email
        GROUP BY uc.cohort_week
        ORDER BY uc.cohort_week
      `);

      res.json(retentionData.rows);
    } catch (error) {
      console.error('[ADMIN] Retention analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch retention data' });
    }
  });

  // Debugging tools - recent errors and issues
  app.get('/api/admin/debug/recent-issues', rateLimit(60, 30), isAdmin, async (req, res) => {
    try {
      const issues = {
        failedEmails: await finalDb.select().from(emails)
          .where(eq(emails.status, 'failed'))
          .orderBy(desc(emails.sentAt))
          .limit(20),
        
        expiredTrials: await finalDb.select().from(users)
          .where(and(
            eq(users.subscriptionStatus, 'trial_expired'),
            isNotNull(users.trialExpiresAt)
          ))
          .orderBy(desc(users.trialExpiresAt))
          .limit(20),
          
        staleConnections: await finalDb.select().from(connections)
          .where(and(
            eq(connections.status, 'pending'),
            sql`${connections.createdAt} < NOW() - INTERVAL '7 days'`
          ))
          .orderBy(desc(connections.createdAt))
          .limit(20)
      };

      res.json(issues);
    } catch (error) {
      console.error('[ADMIN] Debug issues error:', error);
      res.status(500).json({ error: 'Failed to fetch debug data' });
    }
  });

  console.log('[ADMIN] Admin routes configured successfully');
}