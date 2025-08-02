# Twilio SMS Compliance Documentation for Deeper Platform

## Toll-Free Number Application Information

### Company Information
- **Service Name**: Deeper
- **Website**: joindeeper.com
- **Business Type**: Relationship communication platform
- **Industry**: Social/Communication Technology

---

## 1. URLs of Opt-In Policy Images/Screenshots

### Primary Opt-In Policy Page
- **URL**: https://joindeeper.com/sms-opt-in-policy
- **Description**: Comprehensive SMS opt-in policy with detailed consent process, message examples, and opt-out instructions

### Notification Preferences Interface
- **URL**: https://joindeeper.com/dashboard (Account Settings → Notification Preferences)
- **Description**: User account settings where SMS notifications can be enabled/disabled
- **Screenshot Location**: Available in app at Settings → Notifications

### Registration Flow
- **URL**: https://joindeeper.com/auth (Registration section)
- **Description**: During account creation, users can select SMS as their preferred notification method

---

## 2. Use Case Categories

Our SMS messages fall into the following Twilio-approved categories:

### A. **Account Notifications** (Primary Category)
- Turn reminders for conversation responses
- New message notifications
- Connection invitation alerts
- Account status updates

### B. **Customer Care** (Secondary Category)
- Important service updates
- Security notifications
- Account verification

---

## 3. Description of Use Cases

### Detailed Use Case: Conversation Turn Reminders
**Purpose**: Remind users when it's their turn to respond in an ongoing conversation
**Frequency**: Maximum 1-2 messages per conversation thread per week
**Timing**: Sent 24-48 hours after partner's last message
**Business Justification**: Essential for maintaining active communication and platform engagement

### Detailed Use Case: New Message Notifications
**Purpose**: Alert users when they receive a new question or response from their conversation partner
**Frequency**: Real-time, maximum 3-5 messages per week per user
**Timing**: Sent immediately when partner submits a message
**Business Justification**: Core platform functionality for real-time communication

### Detailed Use Case: Connection Invitations
**Purpose**: Notify users when someone invites them to start a new conversation
**Frequency**: As needed, typically 1-2 per month per user
**Timing**: Sent immediately when invitation is created
**Business Justification**: Essential for user acquisition and platform growth

### Detailed Use Case: System Updates
**Purpose**: Important account, security, or service-related notifications
**Frequency**: Rare, maximum 1-2 per month
**Timing**: As needed for critical updates
**Business Justification**: User safety and service continuity

---

## 4. Content of Messages We Will Send

### Turn Reminder Messages
```
Hi [FirstName], it's your turn to respond to [PartnerName] in your Deeper conversation. 
Take your time crafting a thoughtful response at joindeeper.com

Reply STOP to opt out.
```

```
[PartnerName] is waiting for your response in Deeper. 
Your thoughtful dialogue matters. Continue at joindeeper.com

Text STOP to unsubscribe.
```

### New Message Notifications
```
[PartnerName] sent you a new question in Deeper! 
Check it out at joindeeper.com and respond when ready.

Reply STOP to opt out.
```

```
New message from [PartnerName] in your Deeper conversation. 
Login at joindeeper.com to read and respond.

Text STOP to unsubscribe.
```

### Connection Invitation Messages
```
You have a new connection invitation on Deeper from [InviterName]. 
Accept at joindeeper.com/invitation/[ID]

Reply STOP to opt out.
```

```
[InviterName] wants to start a meaningful conversation with you on Deeper. 
Respond at joindeeper.com/invitations

Text STOP to unsubscribe.
```

### System Update Messages
```
Important update to your Deeper account. 
Please login at joindeeper.com to review changes.

Reply STOP to opt out.
```

```
Your Deeper subscription status has changed. 
Visit joindeeper.com/dashboard for details.

Text STOP to unsubscribe.
```

### Opt-Out Confirmation
```
You have been unsubscribed from Deeper SMS notifications. 
You can re-enable them anytime in your account settings at joindeeper.com
```

---

## 5. Opt-In Process Documentation

### Method 1: Account Settings (Primary)
1. User logs into their Deeper account
2. Navigates to Settings → Notification Preferences
3. Selects "SMS" as notification method
4. Enters/confirms phone number
5. Receives confirmation SMS with opt-in verification

### Method 2: Registration Flow
1. During account creation at joindeeper.com/auth
2. User selects notification preferences
3. Chooses "SMS notifications" option
4. Provides phone number
5. Completes double opt-in verification

### Method 3: Connection Setup
1. When creating or accepting conversation invitations
2. User prompted for notification preferences
3. Can select SMS over email notifications
4. Phone number verified via confirmation SMS

---

## 6. Opt-Out Process Documentation

### Automatic Opt-Out (STOP Keywords)
- Users can reply "STOP", "UNSUBSCRIBE", "QUIT", or "CANCEL" to any SMS
- System immediately processes opt-out and confirms via SMS
- User removed from all SMS campaigns within 60 seconds

### Manual Opt-Out (Account Settings)
- Users can change notification preference to "Email Only" in account settings
- Change takes effect immediately
- No SMS messages sent after preference change

### Support-Based Opt-Out
- Users can email support@joindeeper.com to opt out
- Manual processing within 24 hours
- Confirmation sent via email

---

## 7. Message Frequency and Timing

### Maximum Frequency Limits
- **Turn Reminders**: Maximum 2 per conversation thread per week
- **New Messages**: Real-time, maximum 5 per week per user
- **Invitations**: Maximum 3 per month per user
- **System Updates**: Maximum 2 per month per user

### Timing Restrictions
- Messages sent only between 8 AM - 8 PM in user's local timezone
- No messages sent on major holidays
- Respect user's "Do Not Disturb" hours if specified

### Volume Controls
- Maximum 50 SMS messages per batch processed
- Rate limiting: 100ms delay between individual messages
- Daily volume cap: 1000 total SMS messages across all users

---

## 8. Data Protection and Privacy

### Phone Number Handling
- Phone numbers encrypted at rest
- Only used for opted-in SMS notifications
- Never shared with third parties
- Deleted within 30 days of account closure

### Message Content
- No sensitive personal information in SMS content
- Generic templates with minimal personal data
- First names only, no last names or email addresses
- No conversation content included in notifications

---

## 9. Compliance Measures

### Regulatory Compliance
- Full TCPA (Telephone Consumer Protection Act) compliance
- CAN-SPAM Act compliance for all notifications
- GDPR compliance for EU users
- Regular compliance audits and updates

### Technical Compliance
- Automatic opt-out processing (STOP keywords)
- Delivery receipt tracking
- Error handling and retry logic
- Message content filtering and validation

### Monitoring and Reporting
- Daily SMS delivery reports
- Monthly opt-in/opt-out analytics
- Complaint tracking and resolution
- Regular compliance reviews

---

## 10. Contact Information

**Business Contact**:
- Company: Deeper Communications
- Website: joindeeper.com
- Support Email: support@joindeeper.com
- Phone: Available upon request

**Technical Contact**:
- Development Team: dev@joindeeper.com
- Emergency Contact: Available 24/7 for compliance issues

**Compliance Officer**:
- Available for Twilio compliance verification
- Responsible for SMS program oversight
- Regular training on TCPA and SMS best practices

---

## 11. Additional Documentation Available Upon Request

1. **User Consent Records**: Database of all SMS opt-ins with timestamps
2. **Message Templates**: Complete library of approved SMS templates
3. **Delivery Reports**: Historical SMS delivery and engagement metrics
4. **Compliance Training**: Team training records on SMS regulations
5. **Privacy Policy**: Complete privacy policy including SMS data handling
6. **Terms of Service**: User agreement including SMS notification terms

---

## Summary

Deeper operates a compliant, user-centric SMS notification system focused on enhancing meaningful communication between users. Our opt-in process is clear and voluntary, our message content is relevant and valuable, and our opt-out process is immediate and foolproof. We maintain strict frequency limits, respect user preferences, and prioritize data protection.

All documentation, screenshots, and compliance materials are available for Twilio review to support our toll-free number application.

**Last Updated**: August 2, 2025
**Document Version**: 1.0
**Compliance Review Date**: August 2, 2025