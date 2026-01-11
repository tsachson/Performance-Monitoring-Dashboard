/*
  # Update RLS Policies for Public Access

  Updates RLS policies to allow public (non-authenticated) access to all tables.
  This is appropriate for a development/demo tool where authentication is not yet implemented.

  ## Changes
  - Drop existing policies that require authentication
  - Create new policies allowing public access for all operations (SELECT, INSERT, UPDATE, DELETE)
*/

-- Drop and recreate policies for issuers
DROP POLICY IF EXISTS "Users can view all issuers" ON issuers;
DROP POLICY IF EXISTS "Users can insert issuers" ON issuers;
DROP POLICY IF EXISTS "Users can update issuers" ON issuers;
DROP POLICY IF EXISTS "Users can delete issuers" ON issuers;

CREATE POLICY "Public can view all issuers"
  ON issuers FOR SELECT
  USING (true);

CREATE POLICY "Public can insert issuers"
  ON issuers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update issuers"
  ON issuers FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete issuers"
  ON issuers FOR DELETE
  USING (true);

-- Drop and recreate policies for projects
DROP POLICY IF EXISTS "Users can view all projects" ON projects;
DROP POLICY IF EXISTS "Users can insert projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects" ON projects;
DROP POLICY IF EXISTS "Users can delete projects" ON projects;

CREATE POLICY "Public can view all projects"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Public can insert projects"
  ON projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update projects"
  ON projects FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete projects"
  ON projects FOR DELETE
  USING (true);

-- Drop and recreate policies for payment_schedules
DROP POLICY IF EXISTS "Users can view all payment schedules" ON payment_schedules;
DROP POLICY IF EXISTS "Users can insert payment schedules" ON payment_schedules;
DROP POLICY IF EXISTS "Users can update payment schedules" ON payment_schedules;
DROP POLICY IF EXISTS "Users can delete payment schedules" ON payment_schedules;

CREATE POLICY "Public can view all payment schedules"
  ON payment_schedules FOR SELECT
  USING (true);

CREATE POLICY "Public can insert payment schedules"
  ON payment_schedules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update payment schedules"
  ON payment_schedules FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete payment schedules"
  ON payment_schedules FOR DELETE
  USING (true);

-- Drop and recreate policies for payment_history
DROP POLICY IF EXISTS "Users can view all payment history" ON payment_history;
DROP POLICY IF EXISTS "Users can insert payment history" ON payment_history;
DROP POLICY IF EXISTS "Users can update payment history" ON payment_history;
DROP POLICY IF EXISTS "Users can delete payment history" ON payment_history;

CREATE POLICY "Public can view all payment history"
  ON payment_history FOR SELECT
  USING (true);

CREATE POLICY "Public can insert payment history"
  ON payment_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update payment history"
  ON payment_history FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete payment history"
  ON payment_history FOR DELETE
  USING (true);

-- Drop and recreate policies for financial_snapshots
DROP POLICY IF EXISTS "Users can view all financial snapshots" ON financial_snapshots;
DROP POLICY IF EXISTS "Users can insert financial snapshots" ON financial_snapshots;
DROP POLICY IF EXISTS "Users can update financial snapshots" ON financial_snapshots;
DROP POLICY IF EXISTS "Users can delete financial snapshots" ON financial_snapshots;

CREATE POLICY "Public can view all financial snapshots"
  ON financial_snapshots FOR SELECT
  USING (true);

CREATE POLICY "Public can insert financial snapshots"
  ON financial_snapshots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update financial snapshots"
  ON financial_snapshots FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete financial snapshots"
  ON financial_snapshots FOR DELETE
  USING (true);

-- Drop and recreate policies for watchlist_metrics
DROP POLICY IF EXISTS "Users can view all watchlist metrics" ON watchlist_metrics;
DROP POLICY IF EXISTS "Users can insert watchlist metrics" ON watchlist_metrics;
DROP POLICY IF EXISTS "Users can update watchlist metrics" ON watchlist_metrics;
DROP POLICY IF EXISTS "Users can delete watchlist metrics" ON watchlist_metrics;

CREATE POLICY "Public can view all watchlist metrics"
  ON watchlist_metrics FOR SELECT
  USING (true);

CREATE POLICY "Public can insert watchlist metrics"
  ON watchlist_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update watchlist metrics"
  ON watchlist_metrics FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete watchlist metrics"
  ON watchlist_metrics FOR DELETE
  USING (true);

-- Drop and recreate policies for project_status_history
DROP POLICY IF EXISTS "Users can view all project status history" ON project_status_history;
DROP POLICY IF EXISTS "Users can insert project status history" ON project_status_history;
DROP POLICY IF EXISTS "Users can update project status history" ON project_status_history;
DROP POLICY IF EXISTS "Users can delete project status history" ON project_status_history;

CREATE POLICY "Public can view all project status history"
  ON project_status_history FOR SELECT
  USING (true);

CREATE POLICY "Public can insert project status history"
  ON project_status_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update project status history"
  ON project_status_history FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete project status history"
  ON project_status_history FOR DELETE
  USING (true);

-- Drop and recreate policies for monitoring_rules
DROP POLICY IF EXISTS "Users can view all monitoring rules" ON monitoring_rules;
DROP POLICY IF EXISTS "Users can insert monitoring rules" ON monitoring_rules;
DROP POLICY IF EXISTS "Users can update monitoring rules" ON monitoring_rules;
DROP POLICY IF EXISTS "Users can delete monitoring rules" ON monitoring_rules;

CREATE POLICY "Public can view all monitoring rules"
  ON monitoring_rules FOR SELECT
  USING (true);

CREATE POLICY "Public can insert monitoring rules"
  ON monitoring_rules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update monitoring rules"
  ON monitoring_rules FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete monitoring rules"
  ON monitoring_rules FOR DELETE
  USING (true);

-- Drop and recreate policies for support_network_contacts
DROP POLICY IF EXISTS "Users can view all support contacts" ON support_network_contacts;
DROP POLICY IF EXISTS "Users can insert support contacts" ON support_network_contacts;
DROP POLICY IF EXISTS "Users can update support contacts" ON support_network_contacts;
DROP POLICY IF EXISTS "Users can delete support contacts" ON support_network_contacts;

CREATE POLICY "Public can view all support contacts"
  ON support_network_contacts FOR SELECT
  USING (true);

CREATE POLICY "Public can insert support contacts"
  ON support_network_contacts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update support contacts"
  ON support_network_contacts FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete support contacts"
  ON support_network_contacts FOR DELETE
  USING (true);