-- Email System Testing & Monitoring Queries
-- Use these queries in your Supabase SQL Editor to verify email functionality

-- ============================================================
-- 1. CHECK EMAIL SEND LOG - Recent emails
-- ============================================================
-- View the last 10 emails sent (all templates)
SELECT
  id,
  recipient_email,
  template_name,
  status,
  error_message,
  created_at,
  DATE_TRUNC('second', created_at) as time
FROM email_send_log
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- 2. FILTER BY TEMPLATE - Check specific email types
-- ============================================================
-- Check signup confirmation emails
SELECT
  recipient_email,
  status,
  error_message,
  created_at
FROM email_send_log
WHERE template_name = 'signup'
ORDER BY created_at DESC
LIMIT 5;

-- Check password reset (recovery) emails
SELECT
  recipient_email,
  status,
  error_message,
  created_at
FROM email_send_log
WHERE template_name = 'recovery'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================
-- 3. FILTER BY STATUS - Find problems
-- ============================================================
-- Find failed emails (debugging)
SELECT
  recipient_email,
  template_name,
  status,
  error_message,
  created_at
FROM email_send_log
WHERE status IN ('failed', 'dlq', 'rate_limited')
ORDER BY created_at DESC
LIMIT 10;

-- Count emails by status
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
FROM email_send_log
GROUP BY status
ORDER BY count DESC;

-- ============================================================
-- 4. CHECK QUEUE STATUS
-- ============================================================
-- View current email queue state (rate limiting, config)
SELECT
  id,
  retry_after_until,
  batch_size,
  send_delay_ms,
  auth_email_ttl_minutes,
  transactional_email_ttl_minutes,
  updated_at
FROM email_send_state;

-- Check if rate-limited (if retry_after_until is in the future)
SELECT
  CASE
    WHEN retry_after_until > NOW() THEN 'RATE LIMITED - Will retry at: ' || retry_after_until
    WHEN retry_after_until IS NULL THEN 'NOT RATE LIMITED'
    ELSE 'COOLDOWN EXPIRED - Ready to send'
  END as rate_limit_status,
  retry_after_until
FROM email_send_state;

-- ============================================================
-- 5. MONITOR BY EMAIL ADDRESS
-- ============================================================
-- Check all emails sent to a specific user
SELECT
  recipient_email,
  template_name,
  status,
  error_message,
  created_at
FROM email_send_log
WHERE recipient_email = 'user@example.com'  -- CHANGE THIS
ORDER BY created_at DESC;

-- ============================================================
-- 6. TIME-BASED ANALYSIS
-- ============================================================
-- See email volume over time (last 7 days)
SELECT
  DATE(created_at) as date,
  template_name,
  status,
  COUNT(*) as count
FROM email_send_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), template_name, status
ORDER BY DATE(created_at) DESC, template_name;

-- Hourly breakdown (last 24 hours)
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  status,
  COUNT(*) as count
FROM email_send_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), status
ORDER BY hour DESC;

-- ============================================================
-- 7. SUPPRESSED & BOUNCED EMAILS
-- ============================================================
-- Check if an email is suppressed (bounced, complained, unsubscribed)
SELECT
  email,
  reason,
  created_at
FROM suppressed_emails
WHERE email = 'user@example.com'  -- CHANGE THIS
ORDER BY created_at DESC;

-- View all suppressed emails
SELECT
  email,
  reason,
  COUNT(*) as occurrences,
  MAX(created_at) as last_event
FROM suppressed_emails
GROUP BY email, reason
ORDER BY MAX(created_at) DESC
LIMIT 20;

-- ============================================================
-- 8. QUICK HEALTH CHECK
-- ============================================================
-- Run this query to get overall email system health
SELECT
  'Total Emails' as metric, COUNT(*)::text as value
FROM email_send_log
UNION ALL
SELECT 'Successfully Sent', COUNT(*)::text
FROM email_send_log WHERE status = 'sent'
UNION ALL
SELECT 'Failed', COUNT(*)::text
FROM email_send_log WHERE status = 'failed'
UNION ALL
SELECT 'Rate Limited', COUNT(*)::text
FROM email_send_log WHERE status = 'rate_limited'
UNION ALL
SELECT 'Dead Letter Queue', COUNT(*)::text
FROM email_send_log WHERE status = 'dlq'
UNION ALL
SELECT 'In Last 24h', COUNT(*)::text
FROM email_send_log WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 'Success Rate (Last 100)',
  ROUND((COUNT(*) FILTER (WHERE status = 'sent')::numeric / COUNT(*) * 100), 2)::text || '%'
FROM email_send_log
ORDER BY metric;

-- ============================================================
-- 9. TESTING - Send a test signup email
-- ============================================================
-- This creates a log entry for testing purposes
-- (Note: This doesn't actually send an email, just logs it for testing)
-- INSERT INTO email_send_log (message_id, template_name, recipient_email, status)
-- VALUES (gen_random_uuid()::text, 'signup', 'test-user@example.com', 'sent');

-- ============================================================
-- 10. DEBUGGING - Edge Function Logs
-- ============================================================
-- To check Edge Function logs, go to:
-- Supabase Dashboard > Edge Functions > auth-email-hook > Logs
-- or
-- Supabase Dashboard > Edge Functions > process-email-queue > Logs

-- Check for recent function invocations:
-- SELECT * FROM edge_function_logs WHERE created_at > NOW() - INTERVAL '1 hour';
