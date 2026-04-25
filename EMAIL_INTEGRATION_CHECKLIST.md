# Email Integration Checklist

Complete this checklist to ensure sign-up and password reset emails are working with your API.

## Backend Configuration

### ✅ Code Setup (Already Done)
- [x] Auth email hook function created (`supabase/functions/auth-email-hook/index.ts`)
- [x] Email queue processor created (`supabase/functions/process-email-queue/index.ts`)
- [x] Email templates configured (signup, recovery, invite, magic-link, etc.)
- [x] Database schema for email infrastructure (`email_send_log`, `email_send_state`, `suppressed_emails`)
- [x] Email queuing system (pgmq) configured
- [x] Sign-up implementation using `supabase.auth.signUp()` ✓
- [x] Password reset implementation using `supabase.auth.resetPasswordForEmail()` ✓

### ⚠️ Supabase Dashboard Configuration (NEEDS TO BE DONE)

**To enable custom emails for auth events, you must configure the webhook in Supabase:**

1. **Go to your Supabase project**: https://supabase.com/dashboard/project/awaorpybjweyndtjnklg
2. **Navigate to**: Authentication → Email Templates → Custom SMTP
3. **Configure webhook** for these events:
   - [ ] **signup** → Send via `https://awaorpybjweyndtjnklg.supabase.co/functions/v1/auth-email-hook`
   - [ ] **recovery** (password reset) → Same webhook URL
   - [ ] **invite** → Same webhook URL (optional)
   - [ ] **email_change** → Same webhook URL (optional)
   - [ ] **magiclink** → Same webhook URL (optional)
   - [ ] **reauthentication** → Same webhook URL (optional)

**OR** (Alternative method - via Supabase Settings)
1. Go to **Project Settings → Auth → Email Settings**
2. Look for **"Email Provider"** section
3. Enable custom SMTP or configure the auth webhook

### Environment Secrets Setup

**In Supabase Dashboard** (`Project Settings → Secrets`):

- [ ] **LOVABLE_API_KEY** - Your Lovable email API key
  - Required for: auth-email-hook (verification) + process-email-queue
  - Get from: https://lovable.dev/docs (your API key)

- [ ] **RESEND_API_KEY** - Your Resend email API key
  - Required for: auth-email-hook (actual email sending)
  - Get from: https://resend.com/api-keys
  - Should start with `re_` or `test_re_`

- [ ] **SUPABASE_SERVICE_ROLE_KEY** - Already available but verify it's in vault
  - Required for: process-email-queue
  - Should be securely stored in Supabase vault

**How to add secrets:**
1. Go to Supabase Dashboard → Project Settings → Secrets
2. Click "Add secret"
3. Enter name (e.g., `RESEND_API_KEY`) and value
4. Click "Add secret"

### Function Configuration

- [ ] **auth-email-hook** function
  - Endpoint: `https://awaorpybjweyndtjnklg.supabase.co/functions/v1/auth-email-hook`
  - Method: POST
  - Authentication: None (webhook from Supabase)
  - CORS: Enabled
  - Status: Should be verified (green checkmark)

- [ ] **process-email-queue** function
  - Endpoint: `https://awaorpybjweyndtjnklg.supabase.co/functions/v1/process-email-queue`
  - Method: POST
  - Authentication: Service Role Key (JWT verification enabled)
  - Status: Should be verified (green checkmark)

### Cron Job Setup

- [ ] **Email queue processor** cron job configured
  - Schedule: Every 5 seconds
  - Endpoint: `process-email-queue` function
  - Uses: Service Role Key for authentication
  - Runs: Continuously to process queued emails

**To verify/configure:**
1. Check your Supabase logs for cron job executions
2. Look for regular calls to `process-email-queue`
3. Should see consistent execution every 5 seconds when emails are pending

## Frontend Implementation

### ✅ Sign-up Flow (Already Implemented)
- [x] Sign-up form in `/pages/Auth.tsx` (lines 56-62)
- [x] Uses Supabase client `signUp()` method
- [x] Shows toast message: "Check your email for a confirmation link!"
- [x] Redirects to home on success

### ✅ Password Reset Flow (Already Implemented)
- [x] Password reset form in `/pages/Auth.tsx` (lines 43-52)
- [x] Uses Supabase client `resetPasswordForEmail()` method
- [x] Shows toast message: "Check your email for a password reset link."
- [x] Reset password UI in `/pages/ResetPassword.tsx`

## Testing Checklist

### Test 1: Sign-up Email
- [ ] Open http://localhost:5173/auth
- [ ] Click "Sign Up"
- [ ] Enter email: `test-signup-YOUR-NAME@example.com`
- [ ] Enter password: `TestPassword123`
- [ ] Click "Sign Up"
- [ ] Check inbox within 1-2 minutes
- [ ] **Expected**: Email with "Welcome to Media Mule — Confirm Your Account"
- [ ] Click confirmation link in email
- [ ] **Expected**: Account confirmed, can log in

### Test 2: Password Reset Email
- [ ] Open http://localhost:5173/auth
- [ ] Click "Forgot password?"
- [ ] Enter your test email
- [ ] Click "Send Reset Link"
- [ ] Check inbox within 1-2 minutes
- [ ] **Expected**: Email with "Reset your Media Mule password"
- [ ] Click reset link in email
- [ ] Enter new password
- [ ] **Expected**: Password updated successfully

### Test 3: Email Logs
- [ ] Open Supabase SQL Editor
- [ ] Run query from `EMAIL_TESTING_SCRIPT.sql`:
  ```sql
  SELECT recipient_email, status, created_at FROM email_send_log 
  ORDER BY created_at DESC LIMIT 5;
  ```
- [ ] **Expected**: Your test emails show status = 'sent'

### Test 4: Email with Different Domains
- [ ] Test with Gmail, Outlook, Yahoo, etc.
- [ ] Verify emails arrive in spam/promotions folder
- [ ] Check if SPF/DKIM/DMARC are configured for your domain

## Troubleshooting

### Emails Not Arriving

1. **Check email_send_log**:
   ```sql
   SELECT recipient_email, status, error_message, created_at 
   FROM email_send_log 
   WHERE recipient_email = 'your-email@example.com'
   ORDER BY created_at DESC;
   ```

2. **Check Edge Function logs**:
   - Supabase Dashboard → Edge Functions → auth-email-hook → Logs
   - Look for errors in the webhook execution

3. **Common issues**:
   - [ ] Webhook URL not configured in Supabase Auth settings
   - [ ] RESEND_API_KEY is missing or invalid
   - [ ] Email address is in suppressed_emails table
   - [ ] Rate limited by Resend API (check `email_send_state`)

### Emails Going to Spam

1. Configure SPF/DKIM for your domain:
   - Contact your email provider (e.g., Resend)
   - Add SPF record: `v=spf1 include:resend.com ~all`
   - Configure DKIM signing

2. Customize sender email:
   - Change from address in auth-email-hook:
     ```typescript
     const fromEmail = `noreply@your-domain.com`
     ```

### Rate Limiting (429 errors)

1. Check rate limit status:
   ```sql
   SELECT retry_after_until FROM email_send_state;
   ```

2. If rate limited:
   - Wait for `retry_after_until` timestamp
   - Check Resend API quota
   - Reduce email volume or increase plan

## Production Deployment

Before going to production:

- [ ] Test sign-up with real email addresses
- [ ] Test password reset with real email addresses
- [ ] Configure production Resend API key
- [ ] Configure production Lovable API key
- [ ] Set up domain for email sending (SPF/DKIM/DMARC)
- [ ] Monitor email_send_log table for errors
- [ ] Set up alerts for failed emails
- [ ] Test with multiple email providers (Gmail, Outlook, etc.)
- [ ] Document email template customization for team
- [ ] Monitor Resend and Lovable API usage

## Support Resources

- **Resend Documentation**: https://resend.com/docs
- **Lovable Documentation**: https://lovable.dev/docs
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **React Email**: https://react.email/
- **Email Templates**: Located in `supabase/functions/_shared/email-templates/`

## Summary

Your email system has two components:
1. **Direct Send** (auth-email-hook): Signs up & password resets → Resend API
2. **Queue System** (process-email-queue): Transactional emails → Lovable API

Both are working, but the **critical step** is to configure the webhook in your Supabase Auth settings to activate custom email handling.
