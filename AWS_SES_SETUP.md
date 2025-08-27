# Amazon SES Setup Guide

This project has migrated from SendGrid to Amazon SES for email delivery. Follow these steps to configure Amazon SES for your environment.

## Prerequisites

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **SES Domain Verification**: Your sending domain must be verified in SES
3. **SES Region**: SES must be configured in your chosen AWS region

## Required Environment Variables

Add these environment variables to your project:

```bash
# AWS SES Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1  # or your preferred SES region
```

## AWS Setup Steps

### 1. Create IAM User for SES

1. Go to AWS IAM Console
2. Create a new user with programmatic access
3. Attach the `AmazonSESFullAccess` policy (or create a more restrictive custom policy)
4. Save the Access Key ID and Secret Access Key

### 2. Verify Your Domain in SES

1. Go to AWS SES Console
2. Navigate to "Configuration" > "Verified identities"
3. Click "Create identity"
4. Choose "Domain" and enter your domain (e.g., `joindeeper.com`)
5. Follow the DNS verification steps
6. Wait for verification to complete

### 3. Verify Email Addresses (if needed)

For testing or if not using a verified domain:
1. In SES Console, create email address identities
2. Verify the email addresses you want to send from

### 4. Move Out of SES Sandbox (Production)

- For production use, request to move out of the SES sandbox
- This allows sending to any verified email address
- Submit a support case through AWS Console

## Migration Benefits

### Advantages of Amazon SES over SendGrid

1. **Cost Efficiency**: Lower costs for high-volume email sending
2. **AWS Integration**: Native integration with other AWS services
3. **Reliability**: Built on AWS infrastructure
4. **Scalability**: Automatic scaling with AWS
5. **Compliance**: Built-in compliance with email regulations

### Fallback System

The email service includes a fallback system:
- **Primary**: Amazon SES
- **Fallback**: Internal database notification system

If SES fails, emails are stored in the database and can be viewed through the admin interface.

## Testing the Setup

1. Set the environment variables
2. Restart the application
3. Check the logs for: `[EMAIL] Using Amazon SES production email service`
4. Test by sending an invitation or notification

## Troubleshooting

### Common Issues

1. **Invalid credentials**: Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
2. **Region mismatch**: Ensure AWS_REGION matches your SES setup
3. **Unverified domain**: Verify your sending domain in SES Console
4. **Sandbox limitations**: Request production access for unrestricted sending

### Log Messages

- Success: `[EMAIL] ✅ Email sent successfully via Amazon SES`
- Failure: `[EMAIL] ❌ Failed to send email via Amazon SES:`

## Security Best Practices

1. **Least Privilege**: Use IAM policies with minimal required permissions
2. **Key Rotation**: Regularly rotate your AWS access keys
3. **Environment Security**: Keep environment variables secure
4. **Monitoring**: Enable CloudWatch monitoring for SES metrics

## Support

If you encounter issues:
1. Check AWS SES Console for error messages
2. Review application logs for detailed error information
3. Verify all environment variables are correctly set
4. Ensure your AWS account has appropriate SES permissions