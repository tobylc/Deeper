# AWS SNS SMS Setup Guide

## Overview
This guide explains how to configure Amazon Simple Notification Service (SNS) for SMS messaging in the Deeper application. This replaces the previous Twilio SMS integration with AWS native SMS capabilities.

## Prerequisites
- AWS Account with programmatic access
- AWS CLI configured (optional but recommended)
- Environment variables configured in Replit

## Required Environment Variables

Add these environment variables to your Replit project:

```bash
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1  # or your preferred region
```

## SNS Configuration Steps

### 1. IAM Policy Setup
Create an IAM policy with the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sns:Publish",
                "sns:GetSMSAttributes",
                "sns:SetSMSAttributes"
            ],
            "Resource": "*"
        }
    ]
}
```

### 2. SMS Spending Limits
By default, AWS SNS has a $1.00 monthly spending limit for SMS. To increase:

1. Go to SNS Console
2. Navigate to "Text messaging (SMS)" → "Account information"
3. Request spending limit increase if needed

### 3. SMS Attributes (Optional)
Configure global SMS attributes for better delivery:

```bash
aws sns set-sms-attributes --attributes DefaultSMSType=Transactional
aws sns set-sms-attributes --attributes DefaultSenderID=Deeper
```

## SMS Types Supported

The application sends the following SMS types via Amazon SNS:

1. **Connection Invitations** - When users invite others to connect
2. **Connection Accepted/Declined** - Notification when invitations are responded to
3. **Turn Notifications** - When it's someone's turn in a conversation
4. **Verification Codes** - For phone number verification

## Message Attributes

All SMS messages are sent with these attributes:
- `AWS.SNS.SMS.SMSType`: Set to "Transactional" for high priority delivery
- `AWS.SNS.SMS.SenderID`: Set to "Deeper" (where supported by carrier/region)

## Regional Considerations

### Sender ID Support
Sender ID (showing "Deeper" instead of a phone number) is supported in:
- Europe, Asia-Pacific, and some other regions
- NOT supported in USA and Canada (will show as random number)

### Two-Way SMS
Currently not implemented but can be added using:
- SNS for outbound messages
- Pinpoint or dedicated numbers for inbound messages

## Cost Estimation

SMS costs vary by destination:
- US/Canada: ~$0.0075 per message
- International: $0.02-$0.50+ per message depending on country
- First 100 messages per month are free in AWS Free Tier

## Monitoring and Logging

The application logs all SMS activities:
- Success/failure status
- Message IDs from SNS
- Database storage for audit trail
- Console logging for debugging

## Fallback Strategy

If AWS SNS fails or credentials are not configured:
1. Messages are stored in the internal database
2. Users can still see notifications in the app
3. Admin dashboard shows pending SMS messages

## Testing

Test SMS functionality with:
1. Valid phone numbers in E.164 format (+1234567890)
2. Check AWS CloudWatch logs for delivery status
3. Verify database entries for sent messages

## Security Best Practices

1. Use IAM roles with minimal required permissions
2. Rotate AWS credentials regularly
3. Monitor usage in AWS Cost Explorer
4. Set up CloudWatch alarms for unusual spending

## Troubleshooting

Common issues and solutions:

- **Invalid phone number**: Ensure E.164 format (+1234567890)
- **Access denied**: Check IAM permissions
- **Message not delivered**: Check phone number validity and carrier restrictions
- **High costs**: Monitor usage and set spending limits

## Migration from Twilio

The migration maintains the same interface:
- All SMS methods remain the same
- Database storage continues as before  
- Fallback systems remain in place
- No frontend changes required