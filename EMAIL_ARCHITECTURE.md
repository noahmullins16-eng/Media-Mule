# Email Architecture & Flow Diagram

## System Overview

Your Media Mule application uses a sophisticated email system with two main pathways:

### 1. Direct Auth Email Path (Synchronous)
```
User Action (Sign-up / Password Reset)
         ↓
   React Frontend
         ↓
Supabase Auth Client
         ↓
   Supabase Auth Service
         ↓
  Webhook Trigger
         ↓
  auth-email-hook Function
         ↓
   Resend API
         ↓
   Email Delivered
```

### 2. Queue-based Email Path (Asynchronous)
```
Application Trigger
         ↓
Supabase Client (enqueue_email RPC)
         ↓
   pgmq Queue
  (auth_emails or
   transactional_emails)
         ↓
    pg_cron (every 5s)
         ↓
process-email-queue Function
         ↓
   Lovable API
         ↓
   Email Delivered
         ↓
Log sent status
```

## Component Details

### Frontend Components

#### Sign-up Flow
**File**: `src/pages/Auth.tsx` (lines 56-62)

```javascript
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/`
  }
});
```

**What happens:**
1. User enters email and password
2. Supabase creates a pending user account
3. Sends confirmation email via webhook
4. User gets toast: "Check your email for a confirmation link!"

#### Password Reset Flow
**File**: `src/pages/Auth.tsx` (lines 43-52)

```javascript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
});
```

**What happens:**
1. User enters email
2. Supabase generates reset token
3. Sends reset email via webhook
4. User gets toast: "Check your email for a password reset link."
5. User clicks link → `/reset-password` page
6. User sets new password via `supabase.auth.updateUser({ password })`

### Backend Edge Functions

#### auth-email-hook Function
**Location**: `supabase/functions/auth-email-hook/index.ts`

**Trigger**: Supabase Auth webhook for these events:
- `signup` - New account confirmation
- `recovery` - Password reset
- `invite` - User invitations (optional)
- `magiclink` - Magic link login (optional)
- `email_change` - Email change confirmation (optional)
- `reauthentication` - Re-authentication code (optional)

**Process**:
1. Receives webhook from Supabase Auth
2. Verifies webhook signature using `LOVABLE_API_KEY`
3. Maps email type to React email template
4. Renders template to HTML
5. Sends via Resend API using `RESEND_API_KEY`
6. Returns success/error to Supabase

**Email Templates**:
- `signup.tsx` - Account confirmation
- `recovery.tsx` - Password reset
- `invite.tsx` - User invitation
- `magiclink.tsx` - Magic link login
- `email_change.tsx` - Email change confirmation
- `reauthentication.tsx` - Re-auth code

#### process-email-queue Function
**Location**: `supabase/functions/process-email-queue/index.ts`

**Trigger**: pg_cron job (every 5 seconds)

**Process**:
1. Checks rate-limit state in `email_send_state` table
2. Reads batches from `auth_emails` and `transactional_emails` queues
3. For each message:
   - Checks if already sent (idempotency)
   - Checks if max retries exceeded
   - Checks if TTL expired
   - Sends via Lovable API (`sendLovableEmail`)
   - Logs result in `email_send_log`
   - Deletes from queue on success
   - Moves to DLQ on failure

**Features**:
- Rate limit handling (respects Retry-After)
- Idempotent sending (no duplicate emails)
- TTL-based expiration (15min for auth, 60min for transactional)
- Dead letter queue (5 max retries)
- Detailed logging for audit trail

### Database Tables

#### email_send_log
**Purpose**: Audit trail of all email send attempts

```sql
Columns:
- id (UUID) - Unique identifier
- message_id (TEXT) - Idempotency key
- template_name (TEXT) - Email template used (signup, recovery, etc.)
- recipient_email (TEXT) - Recipient address
- status (TEXT) - pending, sent, failed, bounced, complained, dlq
- error_message (TEXT) - Error details if failed
- metadata (JSONB) - Additional data
- created_at (TIMESTAMPTZ) - When email was processed

Indexes:
- idx_email_send_log_created - For time-based queries
- idx_email_send_log_recipient - For user queries
- idx_email_send_log_message - For deduplication
- idx_email_send_log_message_sent_unique - Ensures one sent per message_id
```

#### email_send_state
**Purpose**: Rate limiting and queue configuration

```sql
Columns:
- id (INT) - Always 1 (single row)
- retry_after_until (TIMESTAMPTZ) - Rate limit cooldown expiry
- batch_size (INT) - Messages per batch (default: 10)
- send_delay_ms (INT) - Delay between sends (default: 200ms)
- auth_email_ttl_minutes (INT) - Auth email timeout (default: 15)
- transactional_email_ttl_minutes (INT) - Transactional timeout (default: 60)
- updated_at (TIMESTAMPTZ) - Last update time
```

#### suppressed_emails
**Purpose**: Tracks bounced, complained, and unsubscribed emails

```sql
Columns:
- id (UUID) - Unique identifier
- email (TEXT) - Suppressed email address (unique)
- reason (TEXT) - unsubscribe, bounce, complaint
- metadata (JSONB) - Additional data
- created_at (TIMESTAMPTZ) - When suppressed
```

#### email_unsubscribe_tokens
**Purpose**: One-time unsubscribe links per email

```sql
Columns:
- id (UUID) - Unique identifier
- token (TEXT) - One-time token (unique)
- email (TEXT) - Email address (unique)
- created_at (TIMESTAMPTZ) - Creation time
- used_at (TIMESTAMPTZ) - When unsubscribed
```

### pgmq Queues

#### auth_emails (High Priority)
- Used for time-sensitive auth events
- TTL: 15 minutes (faster expiration)
- Processed first by `process-email-queue`
- Contains signup confirmations, password resets

#### transactional_emails (Normal Priority)
- Used for application messages
- TTL: 60 minutes
- Processed second by `process-email-queue`
- Contains notifications, alerts, etc.

#### auth_emails_dlq & transactional_emails_dlq
- Dead Letter Queues for failed messages
- Messages moved here after 5 failed attempts
- Requires manual intervention to resend

## Data Flow Example: Sign-up Email

### Step 1: User Clicks "Sign Up"
```
Frontend Form
  ↓
signUp(email, password)
  ↓
Supabase Auth API
```

### Step 2: Supabase Creates Account
```
Auth Service
  ↓
Validates credentials
  ↓
Creates user in auth.users
  ↓
Triggers webhook
```

### Step 3: Webhook Calls auth-email-hook
```
Supabase Webhook
  ↓
POST /functions/v1/auth-email-hook
  {
    "data": {
      "action_type": "signup",
      "email": "user@example.com",
      "url": "https://mediamuleco.com/#access_token=...",
      "token": "...",
      "run_id": "..."
    }
  }
```

### Step 4: auth-email-hook Processes
```
1. Verify signature (LOVABLE_API_KEY)
2. Extract action_type = "signup"
3. Load template: SignupEmail
4. Render to HTML with:
   - siteName: "Media Mule"
   - siteUrl: "https://mediamuleco.com"
   - recipient: "user@example.com"
   - confirmationUrl: "https://mediamuleco.com/#access_token=..."
5. Send via Resend API:
   POST https://api.resend.com/emails
   {
     "from": "noreply@notify.mediamuleco.com",
     "to": "user@example.com",
     "subject": "Welcome to Media Mule — Confirm Your Account",
     "html": "<html>...</html>"
   }
6. Log to email_send_log with status = 'sent'
7. Return success response
```

### Step 5: User Receives Email
```
User's inbox
  ↓
Email with "Confirm Your Account" button
  ↓
User clicks link
  ↓
Redirected to home with access_token
  ↓
Account confirmed, user logged in
```

## Configuration Summary

### Environment Variables (Supabase Secrets)
```
LOVABLE_API_KEY = "sk_..." (for webhook signature verification)
RESEND_API_KEY = "re_..." (for Resend email sending)
SUPABASE_SERVICE_ROLE_KEY = "eyJ..." (for service operations)
```

### Function URLs
```
auth-email-hook:
POST https://awaorpybjweyndtjnklg.supabase.co/functions/v1/auth-email-hook

process-email-queue:
POST https://awaorpybjweyndtjnklg.supabase.co/functions/v1/process-email-queue
Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
```

### Cron Job
```
Name: process-email-queue
Schedule: Every 5 seconds
Endpoint: process-email-queue function
Authentication: Service Role Key
```

## Error Handling

### Retry Strategy
```
Attempt 1 → Failed
  ↓
Retry 1 (message stays in queue)
  ↓
Retry 2 (visibility timeout = 30s)
  ↓
Retry 3
  ↓
Retry 4
  ↓
Retry 5
  ↓
Max retries exceeded → Move to DLQ
```

### Rate Limiting
```
Resend returns 429 (Too Many Requests)
  ↓
Extract Retry-After header
  ↓
Set email_send_state.retry_after_until
  ↓
Stop processing (remaining emails stay in queue)
  ↓
Wait until retry_after_until
  ↓
Resume processing
```

### DLQ (Dead Letter Queue)
Messages moved to DLQ when:
- Max retries (5) exceeded
- TTL expired
- Suppressed (bounced/complained)

**Manual handling required** - Review logs and decide on next action

## Performance Characteristics

### Throughput
- Batch size: 10 emails per 5-second cycle
- Send delay: 200ms between emails
- Theoretical max: ~500 emails/hour per queue

### Latency
- Signup confirmation: ~1-2 minutes (direct send)
- Password reset: ~1-2 minutes (direct send)
- Transactional: ~5-15 seconds (queue based)

### Reliability
- Idempotent sends (no duplicates)
- Persistent queue (survives crashes)
- Audit trail (all attempts logged)
- DLQ for failed messages
- Rate limit aware

## Monitoring & Alerts

### Key Metrics to Monitor
```sql
-- Success rate
SELECT COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*)
FROM email_send_log
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Failed emails
SELECT COUNT(*) FROM email_send_log
WHERE status IN ('failed', 'dlq')
AND created_at > NOW() - INTERVAL '1 hour';

-- Queue depth
SELECT COUNT(*) FROM pgmq.q_auth_emails;
SELECT COUNT(*) FROM pgmq.q_transactional_emails;

-- Rate limiting status
SELECT retry_after_until FROM email_send_state
WHERE retry_after_until > NOW();
```

### Alerts to Set Up
- [ ] Failed email rate > 5%
- [ ] Queue depth > 100 messages
- [ ] Email send latency > 5 minutes
- [ ] API errors from Resend/Lovable
- [ ] Rate limited for > 10 minutes

## Next Steps

1. **Configure webhook** in Supabase Auth settings
2. **Set environment secrets** in Supabase
3. **Test sign-up** flow end-to-end
4. **Test password reset** flow end-to-end
5. **Monitor** email_send_log for errors
6. **Configure domain** with SPF/DKIM for production
7. **Set up alerts** for failed emails
8. **Load test** with realistic email volume
