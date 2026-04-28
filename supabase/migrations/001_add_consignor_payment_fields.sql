-- Add new optional payment fields to consignors
ALTER TABLE consignors
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS payment_address text;