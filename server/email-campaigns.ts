import type { User, Connection, Conversation, EmailCampaign, InsertEmailCampaign } from "../shared/schema";
import { storage } from "./storage";
import { emailService } from "./email";

export interface EmailCampaignService {
  schedulePostSignupCampaign(user: User): Promise<void>;
  scheduleInviterNudgeCampaign(userEmail: string): Promise<void>;
  schedulePendingInvitationReminders(connection: Connection): Promise<void>;
  scheduleTurnReminderCampaigns(conversationId: number, recipientEmail: string, senderEmail: string): Promise<void>;
  processPendingCampaigns(): Promise<void>;
  cancelPendingCampaigns(userEmail: string, campaignTypes: string[]): Promise<void>;
}

export class ProductionEmailCampaignService implements EmailCampaignService {
  
  /**
   * Schedule post-signup campaigns based on user type
   */
  async schedulePostSignupCampaign(user: User): Promise<void> {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Determine user type by checking their connections
    const connections = await storage.getConnectionsByEmail(user.email!);
    const isInviter = connections.some(conn => conn.inviterEmail === user.email);
    const isInvitee = connections.some(conn => conn.inviteeEmail === user.email);
    
    let userType = 'unknown';
    let campaignContent = '';
    let subject = '';
    
    if (isInviter && !isInvitee) {
      userType = 'inviter';
      const userName = await storage.getUserDisplayNameByEmail(user.email!);
      subject = `${userName}, take the next step with Deeper`;
      campaignContent = this.generateInviterPost24HourContent(userName);
    } else if (isInvitee && !isInviter) {
      userType = 'invitee';
      const userName = await storage.getUserDisplayNameByEmail(user.email!);
      // Find who invited them
      const inviterConnection = connections.find(conn => conn.inviteeEmail === user.email);
      const inviterName = inviterConnection ? 
        await storage.getUserDisplayNameByEmail(inviterConnection.inviterEmail) : 'Your connection';
      subject = `${userName}, your Deeper journey is beginning`;
      campaignContent = this.generateInviteePost24HourContent(userName, inviterName);
    }
    
    if (userType !== 'unknown') {
      const campaign: InsertEmailCampaign = {
        userEmail: user.email!,
        campaignType: 'post_signup',
        triggerEvent: 'signup',
        userType,
        scheduledAt: in24Hours,
        delayHours: 24,
        emailSubject: subject,
        emailContent: campaignContent,
      };
      
      await storage.createEmailCampaign(campaign);
    }
  }
  
  /**
   * Schedule 72-hour nudge for inviters who haven't sent an invitation
   */
  async scheduleInviterNudgeCampaign(userEmail: string): Promise<void> {
    const now = new Date();
    const in72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    
    const userName = await storage.getUserDisplayNameByEmail(userEmail);
    const subject = `${userName}, someone is waiting to connect with you`;
    const content = this.generateInviterNudge72HourContent(userName);
    
    const campaign: InsertEmailCampaign = {
      userEmail,
      campaignType: 'inviter_nudge',
      triggerEvent: 'no_invitation',
      userType: 'inviter',
      scheduledAt: in72Hours,
      delayHours: 72,
      emailSubject: subject,
      emailContent: content,
    };
    
    await storage.createEmailCampaign(campaign);
  }
  
  /**
   * Schedule daily reminders for pending invitations
   */
  async schedulePendingInvitationReminders(connection: Connection): Promise<void> {
    if (connection.status !== 'pending') return;
    
    const inviteeName = await storage.getUserDisplayNameByEmail(connection.inviteeEmail);
    const inviterName = await storage.getUserDisplayNameByEmail(connection.inviterEmail);
    
    // Schedule daily reminders for up to 7 days
    for (let day = 1; day <= 7; day++) {
      const scheduledTime = new Date();
      scheduledTime.setTime(scheduledTime.getTime() + day * 24 * 60 * 60 * 1000);
      
      const subject = `${inviteeName}, ${inviterName} is waiting to connect with you`;
      const content = this.generatePendingInvitationReminderContent(
        inviteeName, 
        inviterName, 
        connection,
        day
      );
      
      const campaign: InsertEmailCampaign = {
        userEmail: connection.inviteeEmail,
        campaignType: 'pending_invitation',
        triggerEvent: 'no_response',
        userType: 'invitee',
        scheduledAt: scheduledTime,
        connectionId: connection.id,
        delayHours: day * 24,
        emailSubject: subject,
        emailContent: content,
      };
      
      await storage.createEmailCampaign(campaign);
    }
  }
  
  /**
   * Schedule turn reminder campaigns for conversations
   */
  async scheduleTurnReminderCampaigns(conversationId: number, recipientEmail: string, senderEmail: string): Promise<void> {
    const senderName = await storage.getUserDisplayNameByEmail(senderEmail);
    const recipientName = await storage.getUserDisplayNameByEmail(recipientEmail);
    
    // Schedule reminders at 24, 48, and 72 hours
    const delays = [24, 48, 72];
    
    for (const delayHours of delays) {
      const scheduledTime = new Date();
      scheduledTime.setTime(scheduledTime.getTime() + delayHours * 60 * 60 * 1000);
      
      const subject = `${recipientName}, ${senderName} is waiting for your response`;
      const content = this.generateTurnReminderContent(
        recipientName,
        senderName,
        delayHours,
        conversationId
      );
      
      const campaign: InsertEmailCampaign = {
        userEmail: recipientEmail,
        campaignType: 'turn_reminder',
        triggerEvent: 'no_turn_response',
        userType: 'participant',
        scheduledAt: scheduledTime,
        conversationId,
        delayHours,
        emailSubject: subject,
        emailContent: content,
      };
      
      await storage.createEmailCampaign(campaign);
    }
  }
  
  /**
   * Process and send pending campaigns
   */
  async processPendingCampaigns(): Promise<void> {
    const now = new Date();
    const pendingCampaigns = await storage.getPendingEmailCampaigns(now);
    
    for (const campaign of pendingCampaigns) {
      try {
        // Check if the campaign is still relevant before sending
        const isRelevant = await this.isCampaignStillRelevant(campaign);
        
        if (!isRelevant) {
          await storage.updateEmailCampaignStatus(campaign.id, 'cancelled');
          continue;
        }
        
        // Send the email using the existing email service
        await this.sendCampaignEmail(campaign);
        
        // Mark as sent
        await storage.updateEmailCampaignStatus(campaign.id, 'sent');
        
        console.log(`[EMAIL-CAMPAIGN] Sent ${campaign.campaignType} to ${campaign.userEmail}`);
        
      } catch (error) {
        console.error(`[EMAIL-CAMPAIGN] Failed to send campaign ${campaign.id}:`, error);
        await storage.updateEmailCampaignStatus(campaign.id, 'failed');
      }
    }
  }
  
  /**
   * Cancel pending campaigns for a user
   */
  async cancelPendingCampaigns(userEmail: string, campaignTypes: string[]): Promise<void> {
    await storage.cancelPendingEmailCampaigns(userEmail, campaignTypes);
  }
  
  /**
   * Check if a campaign is still relevant
   */
  private async isCampaignStillRelevant(campaign: EmailCampaign): Promise<boolean> {
    switch (campaign.campaignType) {
      case 'pending_invitation':
        if (campaign.connectionId) {
          const connection = await storage.getConnectionById(campaign.connectionId);
          return connection?.status === 'pending';
        }
        return false;
        
      case 'inviter_nudge':
        const connections = await storage.getConnectionsByEmail(campaign.userEmail);
        const hasInvitations = connections.some(conn => conn.inviterEmail === campaign.userEmail);
        return !hasInvitations;
        
      case 'turn_reminder':
        if (campaign.conversationId) {
          const conversation = await storage.getConversationById(campaign.conversationId);
          if (!conversation) return false;
          
          // Check if it's still their turn
          return conversation.currentTurn === campaign.userEmail;
        }
        return false;
        
      default:
        return true;
    }
  }
  
  /**
   * Send campaign email through existing email service
   */
  private async sendCampaignEmail(campaign: EmailCampaign): Promise<void> {
    // Create a synthetic email record for the campaign email
    const emailRecord = {
      toEmail: campaign.userEmail,
      fromEmail: 'notifications@joindeeper.com',
      subject: campaign.emailSubject,
      htmlContent: this.convertToHtml(campaign.emailContent),
      textContent: campaign.emailContent,
      emailType: 'campaign',
      status: 'sent' as const,
      connectionId: campaign.connectionId,
      sentAt: new Date(),
    };
    
    await storage.createEmail(emailRecord);
  }
  
  /**
   * Convert plain text content to HTML
   */
  private convertToHtml(content: string): string {
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://joindeeper.com';
      
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Deeper</h1>
        </div>
        <div class="content">
          ${content.split('\n').map(line => `<p>${line}</p>`).join('')}
          <a href="${appUrl}/dashboard" class="button">Open Deeper</a>
        </div>
        <div class="footer">
          <p>Sent from Deeper - Building meaningful connections through thoughtful conversation</p>
        </div>
      </body>
      </html>
    `;
  }
  
  // Email content generators
  private generateInviterPost24HourContent(userName: string): string {
    return `Hi ${userName},

Thank you for joining Deeper! We're excited to help you build more meaningful connections.

We noticed you haven't sent your first invitation yet. This is the perfect time to reach out to someone special in your life and start a deeper conversation.

Whether it's a family member, close friend, or romantic partner, Deeper provides a private space for thoughtful, turn-based conversations that help you understand each other on a deeper level.

Your first invitation is just a click away. Think of someone you'd love to connect with more meaningfully and take that brave first step.

Ready to get started?`;
  }
  
  private generateInviteePost24HourContent(userName: string, inviterName: string): string {
    return `Hi ${userName},

Welcome to Deeper! ${inviterName} has invited you to join them in a private conversation space designed for meaningful connection.

Keep an eye on your inbox (including spam/junk folders) for their first question. When it arrives, you'll be able to respond and begin this journey of deeper understanding together.

Deeper is all about thoughtful, turn-based conversations that help people connect on a more authentic level. Each question and response is an opportunity to share something meaningful and learn something new about each other.

We're excited for your conversation to begin!`;
  }
  
  private generateInviterNudge72HourContent(userName: string): string {
    return `Hi ${userName},

It's been a few days since you joined Deeper, and we wanted to check in with you.

Building deeper connections starts with a single invitation. We know it can feel vulnerable to reach out, but that's exactly what makes these conversations so powerful.

Consider someone in your life you'd love to understand better:
• A family member you want to connect with more authentically
• A friend you'd like to go beyond surface-level conversations with  
• A romantic partner you want to explore deeper intimacy with

Your invitation could be the beginning of a more meaningful relationship. Sometimes the most rewarding conversations happen when we step outside our comfort zone.

What do you say? Ready to take that step?`;
  }
  
  private generatePendingInvitationReminderContent(inviteeName: string, inviterName: string, connection: Connection, dayNumber: number): string {
    const urgencyText = dayNumber <= 3 ? '' : 
      dayNumber <= 5 ? '\n\nThis invitation won\'t stay open forever, and we\'d hate for you to miss this opportunity to connect.' :
      '\n\nThis is one of our final reminders about this invitation. We hope you\'ll consider joining this meaningful conversation.';
    
    return `Hi ${inviteeName},

${inviterName} is still hoping to connect with you on Deeper for a meaningful ${connection.relationshipType.toLowerCase()} conversation.

${connection.personalMessage ? `They shared this personal message with you: "${connection.personalMessage}"` : ''}

Deeper provides a private, thoughtful space for turn-based conversations that help people understand each other more deeply. Your conversation would be completely private between just the two of you.

To accept this invitation, simply click the link below and create your account with this email address.${urgencyText}

We hope you'll join this journey of meaningful connection.`;
  }
  
  private generateTurnReminderContent(recipientName: string, senderName: string, delayHours: number, conversationId: number): string {
    const timeText = delayHours === 24 ? 'yesterday' : delayHours === 48 ? 'two days ago' : 'a few days ago';
    const encouragementText = delayHours === 24 ? 
      'We know life gets busy, but meaningful conversations are worth prioritizing.' :
      delayHours === 48 ? 
      'These thoughtful exchanges are what make relationships stronger.' :
      'This conversation is waiting for you, and meaningful connections deserve your attention.';
    
    return `Hi ${recipientName},

${senderName} shared something meaningful with you ${timeText} in your Deeper conversation, and they're waiting for your response.

${encouragementText}

Your response doesn't need to be perfect - it just needs to be honest and thoughtful. These conversations are about genuine connection, not performance.

Take a moment to continue this meaningful dialogue. Your voice matters in this conversation.`;
  }
}

// Create the email campaign service
export const emailCampaignService = new ProductionEmailCampaignService();