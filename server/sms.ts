import { Connection } from "../shared/schema";
import twilio from "twilio";
import { storage } from "./storage";

// Extended types for SMS functionality with phone numbers and names
export interface ConnectionWithSMS extends Connection {
  inviterPhone?: string;
  inviteePhone?: string;
  inviterName?: string;
  inviteeName?: string;
}

export interface SMSService {
  sendConnectionInvitation(connection: ConnectionWithSMS): Promise<void>;
  sendConnectionAccepted(connection: ConnectionWithSMS): Promise<void>;
  sendConnectionDeclined(connection: ConnectionWithSMS): Promise<void>;
  sendTurnNotification(params: {
    recipientPhone: string;
    senderName: string;
    conversationId: number;
    relationshipType: string;
    messageType: 'question' | 'response';
  }): Promise<void>;
  sendVerificationCode(phoneNumber: string, code: string): Promise<void>;
}

export class ConsoleSMSService implements SMSService {
  async sendConnectionInvitation(connection: ConnectionWithSMS): Promise<void> {
    console.log('📱 SMS - Connection Invitation:', {
      to: connection.inviteePhone,
      from: connection.inviterEmail,
      type: connection.relationshipType,
      message: connection.personalMessage
    });
  }

  async sendConnectionAccepted(connection: ConnectionWithSMS): Promise<void> {
    console.log('📱 SMS - Connection Accepted:', {
      to: connection.inviterPhone,
      invitee: connection.inviteeEmail,
      type: connection.relationshipType
    });
  }

  async sendConnectionDeclined(connection: ConnectionWithSMS): Promise<void> {
    console.log('📱 SMS - Connection Declined:', {
      to: connection.inviterPhone,
      invitee: connection.inviteeEmail,
      type: connection.relationshipType
    });
  }

  async sendTurnNotification(params: {
    recipientPhone: string;
    senderName: string;
    conversationId: number;
    relationshipType: string;
    messageType: 'question' | 'response';
  }): Promise<void> {
    console.log('📱 SMS - Turn Notification:', {
      to: params.recipientPhone,
      from: params.senderName,
      conversation: params.conversationId,
      type: params.messageType,
      relationship: params.relationshipType
    });
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    console.log('📱 SMS - Verification Code:', {
      to: phoneNumber,
      code: code
    });
  }
}

export class ProductionSMSService implements SMSService {
  private client: twilio.Twilio;
  private fromPhone: string;
  private messagingServiceSid?: string;

  constructor(accountSid: string, authToken: string, fromPhone: string = "+1234567890", messagingServiceSid?: string) {
    this.client = twilio(accountSid, authToken);
    this.fromPhone = fromPhone;
    this.messagingServiceSid = messagingServiceSid;
  }

  async sendConnectionInvitation(connection: ConnectionWithSMS): Promise<void> {
    if (!connection.inviteePhone) return;

    const message = `You've been invited to start a deeper conversation on Deeper! 
${connection.inviterName} wants to connect as ${connection.relationshipType}. 
${connection.personalMessage ? `Personal message: "${connection.personalMessage}"` : ''}
Accept your invitation: https://deepersocial.replit.app/invitation/${connection.id}`;

    const messageOptions: any = {
      body: message,
      to: connection.inviteePhone
    };

    if (this.messagingServiceSid) {
      messageOptions.messagingServiceSid = this.messagingServiceSid;
    } else {
      messageOptions.from = this.fromPhone;
    }

    await this.client.messages.create(messageOptions);
  }

  async sendConnectionAccepted(connection: ConnectionWithSMS): Promise<void> {
    if (!connection.inviterPhone) return;

    const message = `Great news! ${connection.inviteeName} accepted your invitation to connect on Deeper.
You can now start meaningful conversations together.
Begin your conversation: https://deepersocial.replit.app/dashboard`;

    const messageOptions: any = {
      body: message,
      to: connection.inviterPhone
    };

    if (this.messagingServiceSid) {
      messageOptions.messagingServiceSid = this.messagingServiceSid;
    } else {
      messageOptions.from = this.fromPhone;
    }

    await this.client.messages.create(messageOptions);
  }

  async sendConnectionDeclined(connection: ConnectionWithSMS): Promise<void> {
    if (!connection.inviterPhone) return;

    const message = `${connection.inviteeName} has respectfully declined your invitation to connect on Deeper. 
Thank you for reaching out. You can always try connecting with other people who are open to deeper conversations.`;

    const messageOptions: any = {
      body: message,
      to: connection.inviterPhone
    };

    if (this.messagingServiceSid) {
      messageOptions.messagingServiceSid = this.messagingServiceSid;
    } else {
      messageOptions.from = this.fromPhone;
    }

    await this.client.messages.create(messageOptions);
  }

  async sendTurnNotification(params: {
    recipientPhone: string;
    senderName: string;
    conversationId: number;
    relationshipType: string;
    messageType: 'question' | 'response';
  }): Promise<void> {
    const actionText = params.messageType === 'question' ? 'asked you a question' : 'shared a response';
    
    const message = `${params.senderName} ${actionText} in your ${params.relationshipType} conversation on Deeper.
It's your turn to respond!
Continue conversation: https://deepersocial.replit.app/conversation/${params.conversationId}`;

    const messageOptions: any = {
      body: message,
      to: params.recipientPhone
    };

    if (this.messagingServiceSid) {
      messageOptions.messagingServiceSid = this.messagingServiceSid;
    } else {
      messageOptions.from = this.fromPhone;
    }

    await this.client.messages.create(messageOptions);
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    const message = `Your Deeper verification code is: ${code}
This code will expire in 10 minutes. Enter it to verify your phone number.`;

    // Try messaging service first, fall back to phone number if it fails
    let messageOptions: any = {
      body: message,
      to: phoneNumber
    };

    // First attempt with messaging service if available
    if (this.messagingServiceSid) {
      messageOptions.messagingServiceSid = this.messagingServiceSid;
      
      try {
        console.log('Attempting SMS with Messaging Service:', {
          to: phoneNumber,
          messagingServiceSid: this.messagingServiceSid
        });
        
        const result = await this.client.messages.create(messageOptions);
        console.log('SMS sent successfully via Messaging Service:', { sid: result.sid, status: result.status });
        return;
      } catch (error: any) {
        console.warn('Messaging Service failed, falling back to phone number:', {
          error: error.message,
          code: error.code
        });
        
        // Fall back to using phone number instead
        messageOptions = {
          body: message,
          to: phoneNumber,
          from: this.fromPhone
        };
      }
    } else {
      messageOptions.from = this.fromPhone;
    }

    // Send using phone number (either fallback or primary method)
    try {
      console.log('Attempting SMS with phone number:', {
        to: phoneNumber,
        from: this.fromPhone
      });
      
      const result = await this.client.messages.create(messageOptions);
      console.log('SMS sent successfully via phone number:', { sid: result.sid, status: result.status });
    } catch (error: any) {
      console.error('Twilio SMS Error Details:', {
        error: error.message,
        code: error.code,
        moreInfo: error.moreInfo,
        status: error.status,
        details: error.details,
        accountSid: this.accountSid?.substring(0, 10) + '...',
        fromPhone: this.fromPhone
      });
      
      // Handle phone number mismatch error specifically
      if (error.message?.includes('Mismatch between the \'From\' number') || 
          error.message?.includes('account')) {
        throw new Error('SMS service configuration error: The phone number does not belong to the current Twilio account. Please verify your Twilio phone number and account credentials.');
      }
      
      throw new Error(`SMS service temporarily unavailable: ${error.message}`);
    }
  }
}

// Internal SMS service that stores SMS in database
export class InternalSMSService implements SMSService {
  private fromPhone: string;

  constructor(fromPhone: string = "+1234567890") {
    this.fromPhone = fromPhone;
  }

  async sendConnectionInvitation(connection: ConnectionWithSMS): Promise<void> {
    if (!connection.inviteePhone) return;

    const message = `You've been invited to start a deeper conversation on Deeper! 
${connection.inviterName} wants to connect as ${connection.relationshipType}. 
${connection.personalMessage ? `Personal message: "${connection.personalMessage}"` : ''}
Accept your invitation: https://joindeeper.com/invitation/${connection.id}`;

    // Store SMS in database as internal notification system
    await storage.createSMSMessage({
      toPhone: connection.inviteePhone,
      fromPhone: this.fromPhone,
      message,
      smsType: "invitation",
      connectionId: connection.id
    });

    console.log(`[SMS] Invitation notification stored for ${connection.inviteePhone}`);
  }

  async sendConnectionAccepted(connection: ConnectionWithSMS): Promise<void> {
    if (!connection.inviterPhone) return;

    const message = `Great news! ${connection.inviteeName} accepted your invitation to connect on Deeper.
You can now start meaningful conversations together.
Begin your conversation: https://joindeeper.com/dashboard`;

    await storage.createSMSMessage({
      toPhone: connection.inviterPhone,
      fromPhone: this.fromPhone,
      message,
      smsType: "acceptance",
      connectionId: connection.id
    });

    console.log(`[SMS] Acceptance notification stored for ${connection.inviterPhone}`);
  }

  async sendConnectionDeclined(connection: ConnectionWithSMS): Promise<void> {
    if (!connection.inviterPhone) return;

    const message = `${connection.inviteeName} has respectfully declined your invitation to connect on Deeper. 
You can always try reaching out through other channels or invite them again in the future.`;

    await storage.createSMSMessage({
      toPhone: connection.inviterPhone,
      fromPhone: this.fromPhone,
      message,
      smsType: "decline",
      connectionId: connection.id
    });

    console.log(`[SMS] Decline notification stored for ${connection.inviterPhone}`);
  }

  async sendTurnNotification(params: {
    recipientPhone: string;
    senderName: string;
    conversationId: number;
    relationshipType: string;
    messageType: 'question' | 'response';
  }): Promise<void> {
    const actionText = params.messageType === 'question' ? 'asked a question' : 'sent a response';
    const responseText = params.messageType === 'question' ? 'respond' : 'continue the conversation';

    const message = `Your turn! ${params.senderName} just ${actionText} in your ${params.relationshipType.toLowerCase()} conversation. 
It's now your turn to ${responseText}.
Continue conversation: https://joindeeper.com/conversation/${params.conversationId}`;

    await storage.createSMSMessage({
      toPhone: params.recipientPhone,
      fromPhone: this.fromPhone,
      message,
      smsType: "turn_notification"
    });

    console.log(`[SMS] Turn notification stored for ${params.recipientPhone}`);
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    const message = `Your Deeper verification code is: ${code}. This code will expire in 10 minutes.`;

    await storage.createSMSMessage({
      toPhone: phoneNumber,
      fromPhone: this.fromPhone,
      message,
      smsType: "verification"
    });

    console.log(`[SMS] Verification code stored for ${phoneNumber}`);
  }
}

export function createSMSService(): SMSService {
  console.log('[SMS] Using internal database notification system');
  return new InternalSMSService();
}

export const smsService = createSMSService();