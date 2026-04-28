-- Create password reset tokens table
create table public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique default gen_random_uuid()::text,
  expires_at timestamptz not null default now() + interval '1 hour',
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Create email verification tokens table
create table public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique default gen_random_uuid()::text,
  expires_at timestamptz not null default now() + interval '24 hours',
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.password_reset_tokens enable row level security;
alter table public.email_verification_tokens enable row level security;

-- Create indexes for faster lookups
create index idx_password_reset_tokens_user_id on public.password_reset_tokens(user_id);
create index idx_password_reset_tokens_token on public.password_reset_tokens(token);
create index idx_email_verification_tokens_user_id on public.email_verification_tokens(user_id);
create index idx_email_verification_tokens_token on public.email_verification_tokens(token);
