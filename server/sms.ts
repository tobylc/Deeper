import { Connection } from "../shared/schema";
import twilio from "twilio"; // Keep for legacy compatibility but deprecated
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
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

  constructor() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }
    
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    this.fromPhone = process.env.TWILIO_PHONE_NUMBER || "+1234567890";
    this.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    
    console.log('[SMS] Twilio ProductionSMSService initialized with Messaging Service');
  }

  async sendConnectionInvitation(connection: ConnectionWithSMS): Promise<void> {
    if (!connection.inviteePhone) return;

    const message = `You've been invited to start a deeper conversation on Deeper! 
${connection.inviterName} wants to connect as ${connection.relationshipType}. 
${connection.personalMessage ? `Personal message: "${connection.personalMessage}"` : ''}
Accept your invitation: https://joindeeper.com/invitation/${connection.id}`;

    const messageOptions: any = {
      body: message,
      to: connection.inviteePhone
    };

    if (this.messagingServiceSid) {
      messageOptions.messagingServiceSid = this.messagingServiceSid;
    } else {
      messageOptions.from = this.fromPhone;
    }

    try {
      const result = await this.client.messages.create(messageOptions);
      console.log(`[SMS] Connection invitation sent successfully: ${result.sid}`);
      
      // Also store in database for monitoring
      await storage.createSMSMessage({
        toPhone: connection.inviteePhone,
        fromPhone: this.fromPhone,
        message,
        smsType: "invitation",
        connectionId: connection.id
      });
    } catch (error: any) {
      console.error('[SMS] Failed to send connection invitation:', error.message);
      throw error;
    }
  }

  async sendConnectionAccepted(connection: ConnectionWithSMS): Promise<void> {
    if (!connection.inviterPhone) return;

    const message = `Great news! ${connection.inviteeName} accepted your invitation to connect on Deeper.
You can now start meaningful conversations together.
Begin your conversation: https://joindeeper.com/dashboard`;

    const messageOptions: any = {
      body: message,
      to: connection.inviterPhone
    };

    if (this.messagingServiceSid) {
      messageOptions.messagingServiceSid = this.messagingServiceSid;
    } else {
      messageOptions.from = this.fromPhone;
    }

    try {
      const result = await this.client.messages.create(messageOptions);
      console.log(`[SMS] Connection accepted notification sent: ${result.sid}`);
      
      // Also store in database for monitoring
      await storage.createSMSMessage({
        toPhone: connection.inviterPhone,
        fromPhone: this.fromPhone,
        message,
        smsType: "acceptance",
        connectionId: connection.id
      });
    } catch (error: any) {
      console.error('[SMS] Failed to send connection accepted notification:', error.message);
      throw error;
    }
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

    try {
      const result = await this.client.messages.create(messageOptions);
      console.log(`[SMS] Connection declined notification sent: ${result.sid}`);
      
      // Also store in database for monitoring
      await storage.createSMSMessage({
        toPhone: connection.inviterPhone,
        fromPhone: this.fromPhone,
        message,
        smsType: "decline",
        connectionId: connection.id
      });
    } catch (error: any) {
      console.error('[SMS] Failed to send connection declined notification:', error.message);
      throw error;
    }
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
Continue conversation: https://joindeeper.com/conversation/${params.conversationId}`;

    const messageOptions: any = {
      body: message,
      to: params.recipientPhone
    };

    if (this.messagingServiceSid) {
      messageOptions.messagingServiceSid = this.messagingServiceSid;
    } else {
      messageOptions.from = this.fromPhone;
    }

    try {
      const result = await this.client.messages.create(messageOptions);
      console.log(`[SMS] Turn notification sent: ${result.sid}`);
      
      // Also store in database for monitoring
      await storage.createSMSMessage({
        toPhone: params.recipientPhone,
        fromPhone: this.fromPhone,
        message,
        smsType: "turn_notification"
      });
    } catch (error: any) {
      console.error('[SMS] Failed to send turn notification:', error.message);
      throw error;
    }
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
      
      // Also store in database for monitoring
      await storage.createSMSMessage({
        toPhone: phoneNumber,
        fromPhone: this.fromPhone,
        message,
        smsType: "verification"
      });
    } catch (error: any) {
      console.error('Twilio SMS Error Details:', {
        error: error.message,
        code: error.code,
        moreInfo: error.moreInfo,
        status: error.status,
        details: error.details,
        messagingServiceSid: this.messagingServiceSid,
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

// Amazon SNS SMS service for production
export class SNSSMSService implements SMSService {
  private snsClient: SNSClient;
  private fromPhone: string;

  constructor(region: string = 'us-east-1', fromPhone: string = "Deeper") {
    this.snsClient = new SNSClient({ 
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    });
    this.fromPhone = fromPhone;
    console.log('[SMS] Amazon SNS SMS service initialized');
  }

  async sendConnectionInvitation(connection: ConnectionWithSMS): Promise<void> {
    if (!connection.inviteePhone) return;

    const message = `You've been invited to start a deeper conversation on Deeper! 
${connection.inviterName} wants to connect as ${connection.relationshipType}. 
${connection.personalMessage ? `Personal message: "${connection.personalMessage}"` : ''}
Accept your invitation: https://joindeeper.com/invitation/${connection.id}`;

    await this.sendSMS({
      phoneNumber: connection.inviteePhone,
      message,
      messageType: "invitation"
    });

    // Store in database for monitoring
    await storage.createSMSMessage({
      toPhone: connection.inviteePhone,
      fromPhone: this.fromPhone,
      message,
      smsType: "invitation",
      connectionId: connection.id
    });

    console.log(`[SMS] Invitation sent to ${connection.inviteePhone}`);
  }

  async sendConnectionAccepted(connection: ConnectionWithSMS): Promise<void> {
    if (!connection.inviterPhone) return;

    const message = `Great news! ${connection.inviteeName} accepted your invitation to connect on Deeper.
You can now start meaningful conversations together.
Visit: https://joindeeper.com`;

    await this.sendSMS({
      phoneNumber: connection.inviterPhone,
      message,
      messageType: "connection_accepted"
    });

    // Store in database for monitoring
    await storage.createSMSMessage({
      toPhone: connection.inviterPhone,
      fromPhone: this.fromPhone,
      message,
      smsType: "connection_accepted",
      connectionId: connection.id
    });

    console.log(`[SMS] Connection accepted notification sent to ${connection.inviterPhone}`);
  }

  async sendConnectionDeclined(connection: ConnectionWithSMS): Promise<void> {
    if (!connection.inviterPhone) return;

    const message = `${connection.inviteeName} has respectfully declined your invitation to connect on Deeper. 
Meaningful connections take time - consider reaching out in other ways or trying again later.`;

    await this.sendSMS({
      phoneNumber: connection.inviterPhone,
      message,
      messageType: "connection_declined"
    });

    // Store in database for monitoring
    await storage.createSMSMessage({
      toPhone: connection.inviterPhone,
      fromPhone: this.fromPhone,
      message,
      smsType: "connection_declined",
      connectionId: connection.id
    });

    console.log(`[SMS] Connection declined notification sent to ${connection.inviterPhone}`);
  }

  async sendTurnNotification(params: {
    recipientPhone: string;
    senderName: string;
    conversationId: number;
    relationshipType: string;
    messageType: 'question' | 'response';
  }): Promise<void> {
    const actionText = params.messageType === 'question' ? 'asked a question' : 'shared a response';
    const message = `${params.senderName} just ${actionText} in your ${params.relationshipType} conversation on Deeper.
It's your turn to respond and continue this meaningful dialogue.
Visit: https://joindeeper.com/conversation/${params.conversationId}`;

    await this.sendSMS({
      phoneNumber: params.recipientPhone,
      message,
      messageType: "turn_notification"
    });

    // Store in database for monitoring
    await storage.createSMSMessage({
      toPhone: params.recipientPhone,
      fromPhone: this.fromPhone,
      message,
      smsType: "turn_notification"
    });

    console.log(`[SMS] Turn notification sent to ${params.recipientPhone}`);
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    const message = `Your Deeper verification code is: ${code}
This code will expire in 10 minutes. Enter it to verify your phone number.`;

    await this.sendSMS({
      phoneNumber,
      message,
      messageType: "verification"
    });

    // Store in database for monitoring
    await storage.createSMSMessage({
      toPhone: phoneNumber,
      fromPhone: this.fromPhone,
      message,
      smsType: "verification"
    });

    console.log(`[SMS] Verification code sent to ${phoneNumber}`);
  }

  private async sendSMS(params: {
    phoneNumber: string;
    message: string;
    messageType: string;
  }): Promise<void> {
    const command = new PublishCommand({
      PhoneNumber: params.phoneNumber,
      Message: params.message,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: this.fromPhone
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      }
    });

    try {
      console.log(`[SMS] Attempting to send ${params.messageType} via Amazon SNS...`);
      console.log(`[SMS] From: ${this.fromPhone} | To: ${params.phoneNumber}`);
      
      const result = await this.snsClient.send(command);
      console.log(`[SMS] ✅ SMS sent successfully via Amazon SNS | MessageId: ${result.MessageId}`);
    } catch (error: any) {
      console.error('[SMS] ❌ Failed to send SMS via Amazon SNS:', error);
      throw error;
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
  // Use Amazon SNS for SMS delivery with AWS credentials
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('[SMS] Using Amazon SNS SMS service for real SMS delivery');
    const region = process.env.AWS_REGION || 'us-east-1';
    return new SNSSMSService(region);
  }
  
  // Fallback to internal database storage if no AWS credentials
  if (process.env.NODE_ENV === 'production') {
    console.log('[SMS] AWS credentials not found, using internal database SMS storage');
    return new InternalSMSService();
  }
  
  // Use console logging in development
  console.log('[SMS] Using ConsoleSMSService for development');
  return new ConsoleSMSService();
}

export const smsService = createSMSService();