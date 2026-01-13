-- Create Assets Table if it doesn't exist
CREATE TABLE IF NOT EXISTS assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text not null,
  description text not null,
  amount numeric not null,
  currency text default 'ARS',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Liabilities Table if it doesn't exist
CREATE TABLE IF NOT EXISTS liabilities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text not null,
  description text not null,
  total_amount numeric not null,
  monthly_payment numeric default 0,
  remaining_installments integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add currency column if table existed but column didn't (Safety check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'currency') THEN
        ALTER TABLE assets ADD COLUMN currency text DEFAULT 'ARS';
    END IF;
END $$;

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts if re-running
DROP POLICY IF EXISTS "Users can manage their own assets" ON assets;
DROP POLICY IF EXISTS "Users can manage their own liabilities" ON liabilities;

-- Create Policies
CREATE POLICY "Users can manage their own assets"
  ON assets FOR ALL
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can manage their own liabilities"
  ON liabilities FOR ALL
  USING ( auth.uid() = user_id );
