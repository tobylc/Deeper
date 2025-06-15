import type { Connection } from "@shared/schema";
import { storage } from "./storage";
import sgMail from '@sendgrid/mail';

// Email service interface for sending notifications
export interface EmailService {
  sendConnectionInvitation(connection: Connection): Promise<void>;
  sendConnectionAccepted(connection: Connection): Promise<void>;
  sendConnectionDeclined(connection: Connection): Promise<void>;
}

// Simple console email service for development
export class ConsoleEmailService implements EmailService {
  async sendConnectionInvitation(connection: Connection): Promise<void> {
    console.log(`
📧 INVITATION EMAIL
To: ${connection.inviteeEmail}
From: ${connection.inviterEmail}
Subject: You're invited to start a meaningful conversation on Deeper

Hi there!

${connection.inviterEmail} has invited you to connect on Deeper for ${connection.relationshipType} conversations.

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
    console.log(`
📧 CONNECTION ACCEPTED EMAIL
To: ${connection.inviterEmail}
Subject: ${connection.inviteeEmail} accepted your invitation!

Great news! ${connection.inviteeEmail} has accepted your invitation to connect.

Your private conversation space is now ready. You can start by asking the first question.

Visit your dashboard to begin: [Dashboard Link]

Happy connecting!
The Deeper Team
    `);
  }

  async sendConnectionDeclined(connection: Connection): Promise<void> {
    console.log(`
📧 CONNECTION DECLINED EMAIL
To: ${connection.inviterEmail}
Subject: Connection invitation update

${connection.inviteeEmail} has respectfully declined your invitation to connect.

Don't worry - meaningful connections take time. You can always try reaching out through other channels or invite them again in the future.

Keep building meaningful relationships!
The Deeper Team
    `);
  }
}

// Production email service using SendGrid
export class ProductionEmailService implements EmailService {
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string = "noreply@deeper.app") {
    sgMail.setApiKey(apiKey);
    this.fromEmail = fromEmail;
  }

  async sendConnectionInvitation(connection: Connection): Promise<void> {
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://deeper.app';

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
              <strong>${connection.inviterEmail}</strong> has invited you to start meaningful ${connection.relationshipType} conversations on Deeper.
            </p>
            
            ${connection.personalMessage ? `
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #4FACFE; margin: 20px 0;">
                <p style="margin: 0; color: #1e293b; font-style: italic;">"${connection.personalMessage}"</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/auth" style="display: inline-block; background: linear-gradient(135deg, #4FACFE 0%, #00D4FF 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);">
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

${connection.inviterEmail} has invited you to connect on Deeper for ${connection.relationshipType} conversations.

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

    const msg = {
      to: connection.inviterEmail,
      from: this.fromEmail,
      subject: `${connection.inviteeEmail} accepted your invitation!`,
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Great News!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your invitation was accepted</p>
          </div>
          
          <div style="background: #f0fdf4; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
              <strong>${connection.inviteeEmail}</strong> has accepted your invitation to connect!
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
Great news! ${connection.inviteeEmail} has accepted your invitation to connect.

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
              ${connection.inviteeEmail} has respectfully declined your invitation to connect.
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
${connection.inviteeEmail} has respectfully declined your invitation to connect.

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
}

// Internal email service that stores emails in database
export class InternalEmailService implements EmailService {
  private fromEmail: string;

  constructor(fromEmail: string = "noreply@deeper.app") {
    this.fromEmail = fromEmail;
  }

  async sendConnectionInvitation(connection: Connection): Promise<void> {
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://deeper.app';

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
            <strong>${connection.inviterEmail}</strong> has invited you to start meaningful ${connection.relationshipType} conversations on Deeper.
          </p>
          
          ${connection.personalMessage ? `
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #4FACFE; margin: 20px 0;">
              <p style="margin: 0; color: #1e293b; font-style: italic;">"${connection.personalMessage}"</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/auth" style="display: inline-block; background: linear-gradient(135deg, #4FACFE 0%, #00D4FF 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);">
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

${connection.inviterEmail} has invited you to connect on Deeper for ${connection.relationshipType} conversations.

${connection.personalMessage ? `Personal message: "${connection.personalMessage}"` : ''}

To accept this invitation:
1. Visit ${appUrl}/auth
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

    const subject = `${connection.inviteeEmail} accepted your invitation!`;
    
    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Great News!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your invitation was accepted</p>
        </div>
        
        <div style="background: #f0fdf4; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
          <p style="color: #166534; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            <strong>${connection.inviteeEmail}</strong> has accepted your invitation to connect!
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
Great news! ${connection.inviteeEmail} has accepted your invitation to connect.

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
    const subject = "Connection invitation update";
    
    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Invitation Update</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
          <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
            ${connection.inviteeEmail} has respectfully declined your invitation to connect.
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
${connection.inviteeEmail} has respectfully declined your invitation to connect.

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
}

// Email service factory
export function createEmailService(): EmailService {
  // Always use internal email service for now to avoid external dependencies
  console.log('[EMAIL] Using internal database email service');
  return new InternalEmailService();
}

export const emailService = createEmailService();