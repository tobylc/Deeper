import type { Connection } from "@shared/schema";

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

// Production email service (to be implemented with real email provider)
export class ProductionEmailService implements EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string = "noreply@deeper.app") {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendConnectionInvitation(connection: Connection): Promise<void> {
    // TODO: Implement with real email service (SendGrid, AWS SES, etc.)
    console.log("Would send invitation email via production service");
  }

  async sendConnectionAccepted(connection: Connection): Promise<void> {
    // TODO: Implement with real email service
    console.log("Would send acceptance email via production service");
  }

  async sendConnectionDeclined(connection: Connection): Promise<void> {
    // TODO: Implement with real email service
    console.log("Would send decline email via production service");
  }
}

// Email service factory
export function createEmailService(): EmailService {
  const isProduction = process.env.NODE_ENV === 'production';
  const emailApiKey = process.env.EMAIL_API_KEY;

  if (isProduction && emailApiKey) {
    return new ProductionEmailService(emailApiKey);
  }

  return new ConsoleEmailService();
}

export const emailService = createEmailService();