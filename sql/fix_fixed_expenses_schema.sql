-- Final fix for fixed_expenses schema and RLS
-- Run this in Supabase SQL Editor

-- 1. Create table if not exists (covering all fields used in code)
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  due_day integer NOT NULL,
  category text DEFAULT 'Otros',
  type text DEFAULT 'Esencial',
  is_recurring boolean DEFAULT true,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add missing columns if table already existed partially
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT true;
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS start_date date DEFAULT CURRENT_DATE;
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS type text DEFAULT 'Esencial';
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS category text DEFAULT 'Otros';

-- 3. Enable RLS
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

-- 4. Reset Policies (Safe re-run)
DROP POLICY IF EXISTS "Users can view their own fixed expenses" ON fixed_expenses;
DROP POLICY IF EXISTS "Users can insert their own fixed expenses" ON fixed_expenses;
DROP POLICY IF EXISTS "Users can update their own fixed expenses" ON fixed_expenses;
DROP POLICY IF EXISTS "Users can delete their own fixed expenses" ON fixed_expenses;

CREATE POLICY "Users can view their own fixed expenses" ON fixed_expenses FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY "Users can insert their own fixed expenses" ON fixed_expenses FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY "Users can update their own fixed expenses" ON fixed_expenses FOR UPDATE USING ( auth.uid() = user_id );
CREATE POLICY "Users can delete their own fixed expenses" ON fixed_expenses FOR DELETE USING ( auth.uid() = user_id );

COMMIT;
