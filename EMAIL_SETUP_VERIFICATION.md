# Email Setup Verification Guide

This guide helps verify that sign-up and password reset emails are being sent correctly via your email APIs.

## Step 1: Verify Supabase Webhook Configuration

To enable custom email handling for sign-ups and password resets, you need to configure the webhook in your Supabase dashboard:

### In Supabase Dashboard:
1. Go to your project: https://supabase.com/dashboard/project/awaorpybjweyndtjnklg
2. Navigate to **Authentication > Email Templates**
3. Look for **Custom SMTP** or **Email Providers** section
4. You should see or configure:
   - **Webhook URL**: `https://awaorpybjweyndtjnklg.supabase.co/functions/v1/auth-email-hook`
   - **Events**: signup, recovery (password reset), email_change, invite, magiclink, reauthentication

### Alternative: Check via API
Run in your terminal:
```bash
# Check if webhook is configured (requires authenticated session)
curl -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_KEY" \
  https://awaorpybjweyndtjnklg.supabase.co/rest/v1/auth.config \
  -H "apikey: YOUR_SUPABASE_ANON_KEY"
```

## Step 2: Verify Environment Variables

Check that these secrets are configured in Supabase:

### Required Secrets:
- ✓ **LOVABLE_API_KEY**: Used by auth-email-hook (Resend) and process-email-queue
- ✓ **RESEND_API_KEY**: Used by auth-email-hook for direct email sending
- ✓ **SUPABASE_SERVICE_ROLE_KEY**: Used for queue processing

### Check secrets in Supabase:
1. Go to **Project Settings > Secrets / Environment Variables**
2. Verify all three secrets are present

## Step 3: Test Sign-up Flow

### Frontend Test:
1. Go to http://localhost:5173/auth (or your deployed URL)
2. Click "Sign Up"
3. Enter a test email: `test-signup-EMAIL-TIMESTAMP@example.com`
4. Enter a password
5. Click "Sign Up"

### Expected Result:
- Toast message: "Check your email for a confirmation link!"
- You should receive an email within 1-2 minutes

### Troubleshooting:
If email doesn't arrive:
1. Check the Supabase logs: **Dashboard > Logs > Edge Functions**
2. Look for `auth-email-hook` logs
3. Check the `email_send_log` table in your database:
   ```sql
   SELECT * FROM email_send_log 
   WHERE recipient_email = 'your-test-email@example.com'
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

## Step 4: Test Password Reset Flow

### Frontend Test:
1. Go to http://localhost:5173/auth
2. Click "Forgot password?"
3. Enter your test email
4. Click "Send Reset Link"

### Expected Result:
- Toast message: "Check your email for a password reset link."
- You should receive a password reset email within 1-2 minutes

### Troubleshooting:
Same as sign-up - check logs and `email_send_log` table.

## Step 5: Monitor Email Logs

### Check Email Send Log:
```sql
-- View all emails sent/failed in the last hour
SELECT 
  recipient_email,
  status,
  template_name,
  error_message,
  created_at
FROM email_send_log
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;

-- Check specific template
SELECT * FROM email_send_log 
WHERE template_name = 'signup'
ORDER BY created_at DESC 
LIMIT 10;

-- Check for errors
SELECT * FROM email_send_log 
WHERE status IN ('failed', 'dlq')
ORDER BY created_at DESC;
```

### Check Email Send State (Queue Status):
```sql
SELECT * FROM email_send_state;
```

## Verification Checklist

- [ ] Supabase webhook is configured in dashboard
- [ ] LOVABLE_API_KEY is set in environment variables
- [ ] RESEND_API_KEY is set in environment variables
- [ ] SUPABASE_SERVICE_ROLE_KEY is set
- [ ] Sign-up email test passes
- [ ] Password reset email test passes
- [ ] Email logs show "sent" status
- [ ] No errors in email_send_log table

## Email Flow Diagram

```
USER SIGNUP/RESET PASSWORD
           ↓
    Supabase Auth
           ↓
    auth-email-hook (webhook)
           ↓
    Resend API (direct send)
           ↓
    Email delivered
```

## Common Issues & Solutions

### Issue: "Webhook not configured" error
**Solution**: Configure webhook URL in Supabase dashboard Authentication settings

### Issue: Email never arrives
**Solution**: 
1. Check `email_send_log` for failures
2. Verify RESEND_API_KEY is valid
3. Check Supabase function logs for errors

### Issue: "Rate limited" (429 error)
**Solution**: 
1. Check `email_send_state.retry_after_until`
2. Wait for rate limit cooldown
3. Verify RESEND_API_KEY has sufficient quota

### Issue: "Invalid signature" in webhook logs
**Solution**:
1. Verify LOVABLE_API_KEY is correct
2. Check webhook signature verification in auth-email-hook

## Next Steps

Once verified:
1. Deploy to production
2. Monitor email delivery in production
3. Set up alerts for failed emails
4. Test with real users
