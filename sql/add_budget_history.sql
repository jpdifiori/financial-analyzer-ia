
-- 1. Create budget_history table to track changes over time
CREATE TABLE IF NOT EXISTS budget_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id uuid REFERENCES budgets(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  category text NOT NULL,
  period text NOT NULL,
  amount numeric NOT NULL,
  previous_amount numeric,
  change_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS on history table
ALTER TABLE budget_history ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for history
DROP POLICY IF EXISTS "Users can view their own budget history" ON budget_history;
CREATE POLICY "Users can view their own budget history"
  ON budget_history FOR SELECT
  USING ( auth.uid() = user_id );

-- 4. Trigger function to log budget changes
CREATE OR REPLACE FUNCTION log_budget_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO budget_history (budget_id, user_id, category, period, amount, previous_amount)
    VALUES (NEW.id, NEW.user_id, NEW.category, NEW.period, NEW.amount, NULL);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Only log if the amount actually changed
    IF (OLD.amount <> NEW.amount) THEN
      INSERT INTO budget_history (budget_id, user_id, category, period, amount, previous_amount)
      VALUES (NEW.id, NEW.user_id, NEW.category, NEW.period, NEW.amount, OLD.amount);
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO budget_history (budget_id, user_id, category, period, amount, previous_amount)
    VALUES (OLD.id, OLD.user_id, OLD.category, OLD.period, 0, OLD.amount);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach trigger to budgets table
DROP TRIGGER IF EXISTS budget_history_trigger ON budgets;
CREATE TRIGGER budget_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON budgets
FOR EACH ROW EXECUTE FUNCTION log_budget_change();

-- 6. Reload schema notification
NOTIFY pgrst, 'reload schema';
