# Google OAuth Setup Instructions

## Current Issue
Google OAuth is returning a 403 "access denied" error because the redirect URI in your Google Console doesn't match your deployed application URL.

## Required Google Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" > "Credentials"
3. Find your OAuth 2.0 Client ID
4. Edit the client configuration
5. In "Authorized redirect URIs", add:
   - `https://deepersocial.replit.app/api/auth/google/callback`
   - `http://localhost:5000/api/auth/google/callback` (for development)

## Current Callback URL
The application is now configured to use: `https://deepersocial.replit.app/api/auth/google/callback`

## Testing
After updating the Google Console configuration:
1. Wait 5-10 minutes for changes to propagate
2. Try Google login again
3. The authentication should redirect properly to your dashboard

## Troubleshooting
- Ensure the domain `deepersocial.replit.app` is added to authorized origins
- Check that the client ID and secret in Replit secrets match the Google Console
- Verify the OAuth consent screen is properly configured