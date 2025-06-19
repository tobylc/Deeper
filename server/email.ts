import type { Connection } from "@shared/schema";
import { storage } from "./storage";
import sgMail from '@sendgrid/mail';
import { getInvitationText, getEmailSubjectWithRoles } from "@shared/role-display-utils";

// Email service interface for sending notifications
export interface EmailService {
  sendConnectionInvitation(connection: Connection): Promise<void>;
  sendConnectionAccepted(connection: Connection): Promise<void>;
  sendConnectionDeclined(connection: Connection): Promise<void>;
  sendTurnNotification(params: {
    recipientEmail: string;
    senderEmail: string;
    conversationId: number;
    relationshipType: string;
    senderRole?: string;
    recipientRole?: string;
    messageType: 'question' | 'response';
  }): Promise<void>;
}

// Simple console email service for development
export class ConsoleEmailService implements EmailService {
  async sendConnectionInvitation(connection: Connection): Promise<void> {
    const inviterName = await storage.getUserDisplayNameByEmail(connection.inviterEmail);
    const invitationText = getInvitationText(connection.inviterRole, connection.inviteeRole, connection.relationshipType);
    const subject = getEmailSubjectWithRoles('Invitation', connection.inviterRole, connection.inviteeRole, connection.relationshipType);
    
    console.log(`
📧 INVITATION EMAIL
To: ${connection.inviteeEmail}
From: ${connection.inviterEmail}
Subject: ${subject}

Hi there!

${inviterName} has invited you to connect on Deeper for ${invitationText}.

${connection.personalMessage ? `Personal message: "${connection.personalMessage}"` : ''}

To accept this invitation:
1. Visit the Deeper app
2. Register with this email address: ${connection.inviteeEmail}
3. Check your dashboard for pending invitations

This is a private, turn-based conversation space where you can build deeper understanding through thoughtful questions and responses.

Best regards,
The Deeper Team
    `);
  }

  async sendConnectionAccepted(connection: Connection): Promise<void> {
    const inviteeName = await storage.getUserDisplayNameByEmail(connection.inviteeEmail);
    const subject = getEmailSubjectWithRoles('Connection Accepted', connection.inviterRole, connection.inviteeRole, connection.relationshipType);
    const roleDisplay = connection.inviterRole && connection.inviteeRole 
      ? `${connection.inviterRole.toLowerCase()}/${connection.inviteeRole.toLowerCase()}`
      : connection.relationshipType.toLowerCase();
    
    console.log(`
📧 CONNECTION ACCEPTED EMAIL
To: ${connection.inviterEmail}
Subject: ${subject}

Great news! ${inviteeName} has accepted your invitation to connect.

Your private ${roleDisplay} conversation space is now ready. You can start by asking the first question.

Visit your dashboard to begin: [Dashboard Link]

Happy connecting!
The Deeper Team
    `);
  }

  async sendConnectionDeclined(connection: Connection): Promise<void> {
    const inviteeName = await storage.getUserDisplayNameByEmail(connection.inviteeEmail);
    const subject = getEmailSubjectWithRoles('Connection Declined', connection.inviterRole, connection.inviteeRole, connection.relationshipType);
    const roleDisplay = connection.inviterRole && connection.inviteeRole 
      ? `${connection.inviterRole.toLowerCase()}/${connection.inviteeRole.toLowerCase()}`
      : connection.relationshipType.toLowerCase();
    
    console.log(`
📧 CONNECTION DECLINED EMAIL
To: ${connection.inviterEmail}
Subject: ${subject}

${inviteeName} has respectfully declined your ${roleDisplay} connection invitation.

Don't worry - meaningful connections take time. You can always try reaching out through other channels or invite them again in the future.

Keep building meaningful relationships!
The Deeper Team
    `);
  }

  async sendTurnNotification(params: {
    recipientEmail: string;
    senderEmail: string;
    conversationId: number;
    relationshipType: string;
    messageType: 'question' | 'response';
  }): Promise<void> {
    const senderName = await storage.getUserDisplayNameByEmail(params.senderEmail);
    const actionText = params.messageType === 'question' ? 'asked a question' : 'shared a response';
    
    console.log(`
📧 TURN NOTIFICATION EMAIL
To: ${params.recipientEmail}
Subject: It's your turn! ${senderName} ${actionText}

Hi there!

${senderName} just ${actionText} in your ${params.relationshipType.toLowerCase()} conversation.

It's now your turn to respond and continue this meaningful dialogue.

[Visit Conversation Button - ID: ${params.conversationId}]

This is your private, turn-based conversation space designed to deepen your connection.

Best regards,
The Deeper Team
    `);
  }
}

// Production email service using SendGrid
export class ProductionEmailService implements EmailService {
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string = "deepersoc@gmail.com") {
    sgMail.setApiKey(apiKey);
    this.fromEmail = fromEmail;
  }

  async sendConnectionInvitation(connection: Connection): Promise<void> {
    const appUrl = 'https://deepersocial.replit.app';
    const inviterName = await storage.getUserDisplayNameByEmail(connection.inviterEmail);

    const msg = {
      to: connection.inviteeEmail,
      from: this.fromEmail,
      subject: "You're invited to start a meaningful conversation on Deeper",
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4FACFE 0%, #00D4FF 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Deeper</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Meaningful conversations that matter</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0;">You've been invited to connect!</h2>
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
              <strong>${inviterName}</strong> has invited you to start meaningful ${connection.relationshipType} conversations on Deeper.
            </p>
            
            ${connection.personalMessage ? `
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #4FACFE; margin: 20px 0;">
                <p style="margin: 0; color: #1e293b; font-style: italic;">"${connection.personalMessage}"</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/invitation?inviter=${encodeURIComponent(connection.inviterEmail)}&relationship=${encodeURIComponent(connection.relationshipType)}&id=${connection.id}" style="display: inline-block; background: linear-gradient(135deg, #4FACFE 0%, #00D4FF 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);">
                Accept Invitation
              </a>
            </div>
          </div>
          
          <div style="background: white; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">What happens next?</h3>
            <ul style="color: #64748b; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Register with this email address: <strong>${connection.inviteeEmail}</strong></li>
              <li>Check your dashboard for the pending invitation</li>
              <li>Accept to create your private conversation space</li>
              <li>Take turns asking thoughtful questions and sharing responses</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">
              This is a private, turn-based conversation space designed to deepen relationships through meaningful dialogue.
            </p>
          </div>
        </div>
      `,
      text: `
Hi there!

${inviterName} has invited you to connect on Deeper for ${connection.relationshipType} conversations.

${connection.personalMessage ? `Personal message: "${connection.personalMessage}"` : ''}

To accept this invitation:
1. Visit ${appUrl}/auth
2. Register with this email address: ${connection.inviteeEmail}
3. Check your dashboard for pending invitations

This is a private, turn-based conversation space where you can build deeper understanding through thoughtful questions and responses.

Best regards,
The Deeper Team
      `
    };

    try {
      await sgMail.send(msg);
      console.log(`[EMAIL] Invitation sent to ${connection.inviteeEmail}`);
    } catch (error: any) {
      console.error('[EMAIL] Failed to send invitation:', error);
      console.error('[EMAIL] Error details:', error.response?.body);
      throw error;
    }
  }

  async sendConnectionAccepted(connection: Connection): Promise<void> {
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://deeper.app';
    const inviteeName = await storage.getUserDisplayNameByEmail(connection.inviteeEmail);

    const msg = {
      to: connection.inviterEmail,
      from: this.fromEmail,
      subject: `${inviteeName} accepted your invitation!`,
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Great News!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your invitation was accepted</p>
          </div>
          
          <div style="background: #f0fdf4; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
              <strong>${inviteeName}</strong> has accepted your invitation to connect!
            </p>
            
            <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0;">
              Your private conversation space is now ready. You can start by asking the first question.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                Start Conversation
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">
              Happy connecting! Build meaningful relationships through thoughtful dialogue.
            </p>
          </div>
        </div>
      `,
      text: `
Great news! ${inviteeName} has accepted your invitation to connect.

Your private conversation space is now ready. You can start by asking the first question.

Visit your dashboard to begin: ${appUrl}

Happy connecting!
The Deeper Team
      `
    };

    try {
      await sgMail.send(msg);
      console.log(`[EMAIL] Acceptance notification sent to ${connection.inviterEmail}`);
    } catch (error) {
      console.error('[EMAIL] Failed to send acceptance notification:', error);
      throw error;
    }
  }

  async sendConnectionDeclined(connection: Connection): Promise<void> {
    const inviteeName = await storage.getUserDisplayNameByEmail(connection.inviteeEmail);
    
    const msg = {
      to: connection.inviterEmail,
      from: this.fromEmail,
      subject: "Connection invitation update",
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Invitation Update</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
              ${inviteeName} has respectfully declined your invitation to connect.
            </p>
            
            <p style="color: #6B7280; line-height: 1.6; margin: 0;">
              Don't worry - meaningful connections take time. You can always try reaching out through other channels or invite them again in the future.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">
              Keep building meaningful relationships!
            </p>
          </div>
        </div>
      `,
      text: `
${inviteeName} has respectfully declined your invitation to connect.

Don't worry - meaningful connections take time. You can always try reaching out through other channels or invite them again in the future.

Keep building meaningful relationships!
The Deeper Team
      `
    };

    try {
      await sgMail.send(msg);
      console.log(`[EMAIL] Decline notification sent to ${connection.inviterEmail}`);
    } catch (error) {
      console.error('[EMAIL] Failed to send decline notification:', error);
      throw error;
    }
  }

  async sendTurnNotification(params: {
    recipientEmail: string;
    senderEmail: string;
    conversationId: number;
    relationshipType: string;
    messageType: 'question' | 'response';
  }): Promise<void> {
    const appUrl = 'https://deepersocial.replit.app';
    const senderName = await storage.getUserDisplayNameByEmail(params.senderEmail);
    const actionText = params.messageType === 'question' ? 'asked a question' : 'shared a response';
    const responseText = params.messageType === 'question' ? 'respond' : 'continue the conversation';

    const msg = {
      to: params.recipientEmail,
      from: this.fromEmail,
      subject: `It's your turn! ${senderName} ${actionText}`,
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4FACFE 0%, #00D4FF 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Your Turn!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Time to continue your meaningful conversation</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0;">Message waiting for you</h2>
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
              <strong>${senderName}</strong> just ${actionText} in your ${params.relationshipType.toLowerCase()} conversation.
            </p>
            
            <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
              It's now your turn to ${responseText} and continue this meaningful dialogue.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/conversation/${params.conversationId}" style="display: inline-block; background: linear-gradient(135deg, #4FACFE 0%, #00D4FF 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);">
                Continue Conversation
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">
              This is your private, turn-based conversation space designed to deepen relationships through meaningful dialogue.
            </p>
          </div>
        </div>
      `,
      text: `
Hi there!

${senderName} just ${actionText} in your ${params.relationshipType.toLowerCase()} conversation.

It's now your turn to ${responseText} and continue this meaningful dialogue.

Visit your conversation: ${appUrl}/conversation/${params.conversationId}

This is your private, turn-based conversation space designed to deepen your connection.

Best regards,
The Deeper Team
      `
    };

    try {
      await sgMail.send(msg);
      console.log(`[EMAIL] Turn notification sent to ${params.recipientEmail}`);
    } catch (error) {
      console.error('[EMAIL] Failed to send turn notification:', error);
      throw error;
    }
  }
}

// Internal email service that stores emails in database
export class InternalEmailService implements EmailService {
  private fromEmail: string;

  constructor(fromEmail: string = "deepersoc@gmail.com") {
    this.fromEmail = fromEmail;
  }

  async sendConnectionInvitation(connection: Connection): Promise<void> {
    const appUrl = 'https://deepersocial.replit.app';
    const inviterName = await storage.getUserDisplayNameByEmail(connection.inviterEmail);

    const subject = "You're invited to start a meaningful conversation on Deeper";
    
    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4FACFE 0%, #00D4FF 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Deeper</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Meaningful conversations that matter</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">You've been invited to connect!</h2>
          <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
            <strong>${inviterName}</strong> has invited you to start meaningful ${connection.relationshipType} conversations on Deeper.
          </p>
          
          ${connection.personalMessage ? `
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #4FACFE; margin: 20px 0;">
              <p style="margin: 0; color: #1e293b; font-style: italic;">"${connection.personalMessage}"</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/invitation?inviter=${encodeURIComponent(connection.inviterEmail)}&relationship=${encodeURIComponent(connection.relationshipType)}&id=${connection.id}" style="display: inline-block; background: linear-gradient(135deg, #4FACFE 0%, #00D4FF 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);">
              Accept Invitation
            </a>
          </div>
        </div>
        
        <div style="background: white; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">What happens next?</h3>
          <ul style="color: #64748b; line-height: 1.6; margin: 0; padding-left: 20px;">
            <li>Register with this email address: <strong>${connection.inviteeEmail}</strong></li>
            <li>Check your dashboard for the pending invitation</li>
            <li>Accept to create your private conversation space</li>
            <li>Take turns asking thoughtful questions and sharing responses</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">
            This is a private, turn-based conversation space designed to deepen relationships through meaningful dialogue.
          </p>
        </div>
      </div>
    `;

    const textContent = `
Hi there!

${inviterName} has invited you to connect on Deeper for ${connection.relationshipType} conversations.

${connection.personalMessage ? `Personal message: "${connection.personalMessage}"` : ''}

To accept this invitation:
1. Visit ${appUrl}/invitation?inviter=${encodeURIComponent(connection.inviterEmail)}&relationship=${encodeURIComponent(connection.relationshipType)}&id=${connection.id}
2. Register with this email address: ${connection.inviteeEmail}
3. Check your dashboard for pending invitations

This is a private, turn-based conversation space where you can build deeper understanding through thoughtful questions and responses.

Best regards,
The Deeper Team
    `;

    // Store email in database instead of sending
    await storage.createEmail({
      toEmail: connection.inviteeEmail,
      fromEmail: this.fromEmail,
      subject,
      htmlContent,
      textContent,
      emailType: "invitation",
      connectionId: connection.id,
    });

    console.log(`[EMAIL] Invitation notification stored for ${connection.inviteeEmail}`);
  }

  async sendConnectionAccepted(connection: Connection): Promise<void> {
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://deeper.app';
    const inviteeName = await storage.getUserDisplayNameByEmail(connection.inviteeEmail);

    const subject = `${inviteeName} accepted your invitation!`;
    
    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Great News!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your invitation was accepted</p>
        </div>
        
        <div style="background: #f0fdf4; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
          <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            <strong>${inviteeName}</strong> has accepted your invitation to connect!
          </p>
          
          <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0;">
            Your private conversation space is now ready. You can start by asking the first question.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              Start Conversation
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">
            Happy connecting! Build meaningful relationships through thoughtful dialogue.
          </p>
        </div>
      </div>
    `;

    const textContent = `
Great news! ${inviteeName} has accepted your invitation to connect.

Your private conversation space is now ready. You can start by asking the first question.

Visit your dashboard to begin: ${appUrl}

Happy connecting!
The Deeper Team
    `;

    await storage.createEmail({
      toEmail: connection.inviterEmail,
      fromEmail: this.fromEmail,
      subject,
      htmlContent,
      textContent,
      emailType: "acceptance",
      connectionId: connection.id,
    });

    console.log(`[EMAIL] Acceptance notification stored for ${connection.inviterEmail}`);
  }

  async sendConnectionDeclined(connection: Connection): Promise<void> {
    const inviteeName = await storage.getUserDisplayNameByEmail(connection.inviteeEmail);
    
    const subject = "Connection invitation update";
    
    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Invitation Update</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
          <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
            ${inviteeName} has respectfully declined your invitation to connect.
          </p>
          
          <p style="color: #6B7280; line-height: 1.6; margin: 0;">
            Don't worry - meaningful connections take time. You can always try reaching out through other channels or invite them again in the future.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">
            Keep building meaningful relationships!
          </p>
        </div>
      </div>
    `;

    const textContent = `
${inviteeName} has respectfully declined your invitation to connect.

Don't worry - meaningful connections take time. You can always try reaching out through other channels or invite them again in the future.

Keep building meaningful relationships!
The Deeper Team
    `;

    await storage.createEmail({
      toEmail: connection.inviterEmail,
      fromEmail: this.fromEmail,
      subject,
      htmlContent,
      textContent,
      emailType: "decline",
      connectionId: connection.id,
    });

    console.log(`[EMAIL] Decline notification stored for ${connection.inviterEmail}`);
  }

  async sendTurnNotification(params: {
    recipientEmail: string;
    senderEmail: string;
    conversationId: number;
    relationshipType: string;
    messageType: 'question' | 'response';
  }): Promise<void> {
    const appUrl = 'https://deepersocial.replit.app';
    const senderName = await storage.getUserDisplayNameByEmail(params.senderEmail);
    const actionText = params.messageType === 'question' ? 'asked a question' : 'shared a response';
    const responseText = params.messageType === 'question' ? 'respond' : 'continue the conversation';

    const subject = `It's your turn! ${senderName} ${actionText}`;
    
    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4FACFE 0%, #00D4FF 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Your Turn!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Time to continue your meaningful conversation</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0;">Message waiting for you</h2>
          <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            <strong>${senderName}</strong> just ${actionText} in your ${params.relationshipType.toLowerCase()} conversation.
          </p>
          
          <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0;">
            It's now your turn to ${responseText} and continue this meaningful dialogue.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/conversation/${params.conversationId}" style="display: inline-block; background: linear-gradient(135deg, #4FACFE 0%, #00D4FF 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);">
              Continue Conversation
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">
            This is your private, turn-based conversation space designed to deepen relationships through meaningful dialogue.
          </p>
        </div>
      </div>
    `;

    const textContent = `
Hi there!

${senderName} just ${actionText} in your ${params.relationshipType.toLowerCase()} conversation.

It's now your turn to ${responseText} and continue this meaningful dialogue.

Visit your conversation: ${appUrl}/conversation/${params.conversationId}

This is your private, turn-based conversation space designed to deepen your connection.

Best regards,
The Deeper Team
    `;

    await storage.createEmail({
      toEmail: params.recipientEmail,
      fromEmail: this.fromEmail,
      subject,
      htmlContent,
      textContent,
      emailType: "turn_notification",
      connectionId: params.conversationId,
    });

    console.log(`[EMAIL] Turn notification stored for ${params.recipientEmail}`);
  }
}

// Email service factory
export function createEmailService(): EmailService {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;

  if (sendgridApiKey) {
    console.log('[EMAIL] Using SendGrid email service for real email delivery');
    return new ProductionEmailService(sendgridApiKey);
  }

  console.log('[EMAIL] No SendGrid API key - using internal database service');
  return new InternalEmailService();
}

export const emailService = createEmailService();