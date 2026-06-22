-- Add cancel_token to bookings so clients can cancel via a token-protected link
alter table public.bookings
  add column if not exists cancel_token uuid default gen_random_uuid(),
  add column if not exists status text default 'confirmed';

-- Backfill any existing rows that have a null cancel_token
update public.bookings set cancel_token = gen_random_uuid() where cancel_token is null;
