# AWS S3 Storage Setup for Audio Messages

This application supports persistent audio storage using AWS S3, which prevents voice messages from being lost during deployments and container restarts.

## Why S3 Storage?

**Problem**: By default, voice messages are stored in the local filesystem (`/uploads` directory), which is ephemeral in containerized environments like Replit. This means:
- Audio files are lost when the application restarts
- Voice messages become unplayable when users return to old conversations
- No persistence across deployments

**Solution**: AWS S3 cloud storage provides permanent, reliable file storage that persists across all application restarts and deployments.

## Current Status

The application automatically detects your storage configuration:
- **S3 Configured**: Voice messages stored permanently in AWS S3
- **Local Storage**: Voice messages stored locally (⚠️ may not persist across restarts)

## Setting Up S3 Storage

### 1. Create AWS Account and S3 Bucket

1. Sign up for an AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Navigate to the S3 service
3. Create a new bucket with these settings:
   - Choose a unique bucket name (e.g., `yourapp-voice-messages`)
   - Select your preferred region
   - **Uncheck "Block all public access"** (required for audio playback)
   - Enable bucket versioning (optional but recommended)

### 2. Configure Bucket Permissions

Add this CORS configuration to your bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": [],
        "MaxAgeSeconds": 3000
    }
]
```

### 3. Create IAM User and Access Keys

1. Go to AWS IAM service
2. Create a new user (e.g., `voice-messages-user`)
3. Attach this policy to the user:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME/*",
                "arn:aws:s3:::YOUR_BUCKET_NAME"
            ]
        }
    ]
}
```

4. Create access keys for this user and save them securely

### 4. Configure Environment Variables

Add these environment variables to your Replit project:

```
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=your_region_here
AWS_S3_BUCKET=your_bucket_name_here
```

**In Replit**: Go to the "Secrets" tab in your workspace and add each variable.

### 5. Verify Configuration

After adding the environment variables, restart your application. You should see:

```
[S3] S3 service configured successfully
```

Instead of:

```
[S3] S3 not configured - falling back to local storage
```

## Admin Monitoring

Administrators can check storage status at: `/api/admin/storage-status`

This endpoint shows:
- Whether S3 is configured
- S3 connection test results
- Environment variable status
- Current storage type being used

## Migration from Local to S3

When you enable S3 storage:
- **New voice messages** will be stored in S3
- **Existing local files** will continue to work until the next restart
- **No automatic migration** occurs (existing files may be lost on restart)

For permanent migration, you would need to manually upload existing files to S3, but this is typically not necessary as voice messages are conversation-specific.

## Troubleshooting

### Common Issues

1. **"Audio file not accessible"**: Check CORS configuration on your S3 bucket
2. **"S3 connection failed"**: Verify your access keys and bucket permissions
3. **"Authentication required"**: Ensure your bucket allows public read access for the uploaded files

### Testing S3 Connection

The application automatically tests S3 connectivity on startup. Check the logs for:
- `[S3] S3 service configured successfully` ✅
- `[S3] S3 connection test failed` ❌

### Debug Mode

In development, you'll see detailed logs showing:
- Whether each voice message is uploaded to S3 or stored locally
- File URLs and storage types
- Any upload or access errors

## Cost Considerations

AWS S3 pricing for voice messages is typically very low:
- **Storage**: ~$0.023 per GB per month
- **Requests**: ~$0.0004 per 1,000 requests
- **Data Transfer**: First 100 GB out to internet free

For a typical conversation app, monthly costs are usually under $1.

## Security

- Access keys should be kept secure and rotated regularly
- Consider using IAM roles instead of access keys for production deployments
- Monitor your S3 access logs for any unusual activity
- Enable S3 bucket versioning for additional data protection