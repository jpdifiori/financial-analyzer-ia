-- FINAL FIX for 'incomes' table schema and RLS
-- Run this in your Supabase SQL Editor

-- 1. Ensure table and základné stĺpce
CREATE TABLE IF NOT EXISTS incomes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  type text CHECK (type IN ('Salario', 'Renta', 'Inversiones', 'Otro')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Ensure all feature columns exist
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT true;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS start_date date DEFAULT CURRENT_DATE;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS receive_date date;

-- 3. Enable RLS
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- 4. Reset Policies (Including UPDATE which was missing!)
DROP POLICY IF EXISTS "Users can view their own incomes" ON incomes;
DROP POLICY IF EXISTS "Users can insert their own incomes" ON incomes;
DROP POLICY IF EXISTS "Users can update their own incomes" ON incomes;
DROP POLICY IF EXISTS "Users can delete their own incomes" ON incomes;

CREATE POLICY "Users can view their own incomes" ON incomes FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY "Users can insert their own incomes" ON incomes FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY "Users can update their own incomes" ON incomes FOR UPDATE USING ( auth.uid() = user_id );
CREATE POLICY "Users can delete their own incomes" ON incomes FOR DELETE USING ( auth.uid() = user_id );

-- 5. Force schema cache reload (implicitly by doing a minor DDL or just commit)
COMMENT ON TABLE incomes IS 'Table for tracking user incomes with support for recurring items and versioning.';

COMMIT;
