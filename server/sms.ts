import { Connection } from "../shared/schema";
import twilio from "twilio";

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
        details: error.details
      });
      throw error;
    }
  }
}

export class InternalSMSService implements SMSService {
  private fromPhone: string;

  constructor(fromPhone: string = "+1234567890") {
    this.fromPhone = fromPhone;
  }

  async sendConnectionInvitation(connection: ConnectionWithSMS): Promise<void> {
    // Internal SMS service could use a different provider or queue system
    console.log('Internal SMS - Connection Invitation queued');
  }

  async sendConnectionAccepted(connection: ConnectionWithSMS): Promise<void> {
    console.log('Internal SMS - Connection Accepted queued');
  }

  async sendConnectionDeclined(connection: ConnectionWithSMS): Promise<void> {
    console.log('Internal SMS - Connection Declined queued');
  }

  async sendTurnNotification(params: {
    recipientPhone: string;
    senderName: string;
    conversationId: number;
    relationshipType: string;
    messageType: 'question' | 'response';
  }): Promise<void> {
    console.log('Internal SMS - Turn Notification queued');
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    console.log('Internal SMS - Verification Code queued');
  }
}

export function createSMSService(): SMSService {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFromPhone = process.env.TWILIO_PHONE_NUMBER;
  const twilioMessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  console.log('SMS Service Configuration Check:', {
    accountSid: twilioAccountSid ? 'SET' : 'MISSING',
    authToken: twilioAuthToken ? 'SET' : 'MISSING',
    fromPhone: twilioFromPhone ? 'SET' : 'MISSING',
    messagingServiceSid: twilioMessagingServiceSid ? 'SET' : 'MISSING',
    nodeEnv: process.env.NODE_ENV
  });

  // Use production SMS service if Twilio credentials are available
  if (twilioAccountSid && twilioAuthToken && twilioFromPhone) {
    console.log('Using ProductionSMSService with Twilio (phone number method)');
    console.log('Twilio Configuration:', {
      hasAccountSid: !!twilioAccountSid,
      hasAuthToken: !!twilioAuthToken,
      hasFromPhone: !!twilioFromPhone,
      hasMessagingService: !!twilioMessagingServiceSid,
      fromPhone: twilioFromPhone,
      primaryMethod: 'phone_number'
    });
    // Pass null for messaging service to prioritize phone number
    return new ProductionSMSService(twilioAccountSid, twilioAuthToken, twilioFromPhone, null);
  } else if (twilioAccountSid && twilioAuthToken && twilioMessagingServiceSid) {
    console.log('Using ProductionSMSService with Twilio (messaging service fallback)');
    return new ProductionSMSService(twilioAccountSid, twilioAuthToken, twilioFromPhone, twilioMessagingServiceSid);
  } else {
    console.log('Twilio credentials incomplete, using ConsoleSMSService for development');
    console.log('Missing credentials:', {
      accountSid: !twilioAccountSid,
      authToken: !twilioAuthToken,
      hasFromPhone: !!twilioFromPhone,
      hasMessagingService: !!twilioMessagingServiceSid
    });
    return new ConsoleSMSService();
  }
}

export const smsService = createSMSService();