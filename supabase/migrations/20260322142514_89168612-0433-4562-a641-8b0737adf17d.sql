
-- Update the subscription_tier enum to new values: basic, studio, enterprise
-- First rename existing values
ALTER TYPE public.subscription_tier RENAME VALUE 'starter' TO 'basic';
-- 'pro' needs to be removed - move any pro users to basic first
UPDATE public.creator_profiles SET tier = 'basic' WHERE tier = 'pro';
-- 'studio' stays as is
-- 'enterprise' stays as is
-- We can't easily remove enum values in postgres, so we'll recreate
-- Actually, let's just rename starter->basic and keep the rest, dropping 'pro' by migrating users

-- Since we can't drop enum values easily, let's create a new enum and swap
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'basic';
