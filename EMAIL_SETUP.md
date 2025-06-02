# Email Subscription Setup with Resend

This guide explains how to set up and test the email subscription feature in ChessMerge.

## Required Setup Steps

### 1. Add your Resend API Key to Convex

1. Go to your [Convex Dashboard](https://dashboard.convex.dev)
2. Navigate to your project settings
3. Go to "Environment Variables"
4. Add a new environment variable:
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key from [resend.com/api-keys](https://resend.com/api-keys)

### 2. Set Site URL for Unsubscribe Links (REQUIRED)

Add another environment variable in Convex:
- Name: `FRONTEND_URL`
- Value: Your frontend site's URL
  - For development: `http://localhost:5173`
  - For production: `https://your-app.vercel.app` or your custom domain

⚠️ **Important**: Without this environment variable, unsubscribe links in emails will not work!

### 3. Configure Email Domain (Optional)

By default, the system uses Resend's test domain (`onboarding@resend.dev`) which is perfect for testing.

To use your own domain:
1. Verify your domain in Resend
2. Update the `from` field in `convex/emailSubscriptions.ts`:
   ```typescript
   from: "ChessMerge <updates@yourdomain.com>",
   ```

## Testing the Integration

### Where to Find the Email Subscription Form

The email subscription form is now available in three places:

1. **Landing Page** - Below the sign-in form when not authenticated
2. **Game Lobby** - At the bottom of the lobby page
3. **During Games** - In the sidebar below move history (compact version)

### Test Workflow

1. Enter an email address in any subscription form
2. Click "Subscribe"
3. Check your email for the welcome message
4. The email will include an unsubscribe link
5. Click the unsubscribe link to test the unsubscribe flow

### Monitoring

- Check the Convex logs for email sending status
- Look for messages like "Welcome email sent successfully"
- Any errors will be logged but won't break the subscription process

## Features Implemented

✅ Email subscription with validation  
✅ Duplicate email prevention  
✅ Welcome email with Resend  
✅ Unsubscribe functionality  
✅ Unsubscribe page with confirmation  
✅ Responsive design  
✅ Multiple subscription points in the app  

## Next Steps

1. **Custom Email Templates** - Create more sophisticated HTML email templates
2. **Email Campaigns** - Add functionality to send newsletters to all subscribers
3. **Analytics** - Track open rates and engagement using Resend's analytics
4. **Segmentation** - Group subscribers based on their activity
5. **Double Opt-in** - Add email confirmation before marking as subscribed

## Troubleshooting

- **"RESEND_API_KEY not configured"** - Add the API key to Convex environment variables
- **Email not received** - Check spam folder, verify Resend API key is valid
- **Invalid unsubscribe link** - Ensure FRONTEND_URL is set correctly 