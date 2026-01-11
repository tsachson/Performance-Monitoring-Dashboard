/*
  # MDB Investment Monitoring & Management Tool - Core Schema

  ## Overview
  Complete database schema for monitoring multilateral development bank investments
  across debt and equity instruments, with payment tracking, financial monitoring,
  and remediation management capabilities.

  ## New Tables

  ### 1. `issuers`
  Tracks organizations receiving investments
  - `id` (uuid, primary key)
  - `unique_issuer_id` (text, unique identifier)
  - `name` (text, issuer name)
  - `issuer_type` (text, Public or Private)
  - `industry_sector` (text, business sector)
  - `country` (text, jurisdiction)
  - `contact_name`, `contact_title`, `contact_phone`, `contact_email` (text, contact info)
  - `created_at`, `updated_at` (timestamps)

  ### 2. `projects`
  Main investment transactions table
  - `id` (uuid, primary key)
  - `unique_project_id` (text, unique identifier)
  - `project_name` (text)
  - `issuer_id` (uuid, foreign key to issuers)
  - `instrument_type` (text: Senior Debt, Subordinated Debt, Equity, Convertible Debt, etc.)
  - `deal_size` (numeric, total investment amount)
  - `issuance_currency` (text, USD, EUR, JPY, etc.)
  - `country` (text, project country)
  - `issuance_date` (date)
  - `maturity_date` (date, for debt instruments)
  - `tenure_years` (numeric, calculated tenure)
  - `rating` (text, credit rating for debt)
  - `interest_rate` (numeric, annual rate for debt)
  - `rate_type` (text, Fixed or Floating)
  - `reference_rate` (text, for floating: SOFR, LIBOR, etc.)
  - `dividend_rate` (numeric, for equity)
  - `has_warrants` (boolean)
  - `warrant_details` (text)
  - `has_conversion` (boolean)
  - `conversion_details` (text)
  - `seniority` (text, Senior Secured, Senior Unsecured, Subordinated, etc.)
  - `preference_elements` (text)
  - `current_status` (text, performing, watch-list, remediation, closed)
  - `closure_type` (text, fully-satisfied, with-restructuring, partial-loss, complete-loss, null if not closed)
  - `created_at`, `updated_at` (timestamps)

  ### 3. `payment_schedules`
  Expected payment schedule for each project
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key)
  - `payment_due_date` (date)
  - `principal_due` (numeric)
  - `interest_due` (numeric)
  - `total_due` (numeric)
  - `payment_type` (text, interest-only, principal-and-interest, dividend, etc.)
  - `created_at` (timestamp)

  ### 4. `payment_history`
  Actual payments received
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key)
  - `payment_date` (date)
  - `amount_paid` (numeric)
  - `principal_paid` (numeric)
  - `interest_paid` (numeric)
  - `amount_due` (numeric)
  - `payment_status` (text, on-time, late, partial, missed)
  - `deficit_amount` (numeric)
  - `penalty_applied` (numeric)
  - `notes` (text)
  - `created_at` (timestamp)

  ### 5. `financial_snapshots`
  Quarterly financial performance data
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key)
  - `quarter` (text, e.g., Q1-2024)
  - `snapshot_date` (date)
  - `revenue` (numeric)
  - `ebit` (numeric)
  - `ebitda` (numeric)
  - `interest_expense` (numeric)
  - `capex` (numeric)
  - `customer_growth_rate` (numeric, percentage)
  - `churn_rate` (numeric, percentage)
  - `cash_balance` (numeric)
  - `debt_outstanding` (numeric)
  - `input_cost_gas` (numeric)
  - `input_cost_electricity` (numeric)
  - `input_cost_materials` (numeric)
  - `input_cost_wages` (numeric)
  - `created_at` (timestamp)

  ### 6. `watchlist_metrics`
  Current monitoring metrics calculated for each project
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key, unique)
  - `dscr_current` (numeric, Debt Service Coverage Ratio)
  - `dscr_covenant` (numeric)
  - `dscr_trend` (text, improving, stable, declining)
  - `liquidity_days` (numeric, days of operating expenses covered)
  - `covenant_headroom_pct` (numeric, distance to breach)
  - `cash_runway_months` (numeric, for equity)
  - `revenue_vs_plan_pct` (numeric, actual vs projected)
  - `last_reporting_date` (date)
  - `reporting_quality` (text, on-time, delayed, incomplete)
  - `sponsor_support_status` (text, committed, uncertain, withdrawn)
  - `risk_score` (numeric, 0-100 calculated risk score)
  - `updated_at` (timestamp)

  ### 7. `project_status_history`
  Tracks status changes over time
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key)
  - `status` (text, performing, watch-list, remediation-required, etc.)
  - `sub_status` (text, detailed status)
  - `status_date` (date)
  - `changed_by` (text, user who made change)
  - `notes` (text, reason for change)
  - `created_at` (timestamp)

  ### 8. `monitoring_rules`
  Risk-weighted monitoring rules by various factors
  - `id` (uuid, primary key)
  - `rule_name` (text)
  - `industry_sector` (text, applies to which sector)
  - `country` (text, applies to which country)
  - `instrument_type` (text, debt or equity)
  - `rating_threshold` (text, applies to ratings at or below)
  - `dscr_warning_level` (numeric, e.g., 1.2)
  - `dscr_critical_level` (numeric, e.g., 1.0)
  - `liquidity_warning_days` (numeric, e.g., 90)
  - `liquidity_critical_days` (numeric, e.g., 60)
  - `review_frequency` (text, weekly, monthly, quarterly)
  - `escalation_required` (boolean)
  - `is_active` (boolean)
  - `created_at`, `updated_at` (timestamps)

  ### 9. `support_network_contacts`
  Internal bank team contacts for each project
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key)
  - `team_type` (text, Sector, Country, Credit, Finance, Treasury, etc.)
  - `contact_name` (text)
  - `contact_title` (text)
  - `contact_phone` (text)
  - `contact_email` (text)
  - `is_primary` (boolean)
  - `notes` (text)
  - `created_at`, `updated_at` (timestamps)

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users to manage their data
*/

-- Create issuers table
CREATE TABLE IF NOT EXISTS issuers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_issuer_id text UNIQUE NOT NULL,
  name text NOT NULL,
  issuer_type text NOT NULL CHECK (issuer_type IN ('Public', 'Private')),
  industry_sector text NOT NULL,
  country text NOT NULL,
  contact_name text,
  contact_title text,
  contact_phone text,
  contact_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_project_id text UNIQUE NOT NULL,
  project_name text NOT NULL,
  issuer_id uuid REFERENCES issuers(id) ON DELETE CASCADE,
  instrument_type text NOT NULL,
  deal_size numeric NOT NULL,
  issuance_currency text NOT NULL DEFAULT 'USD',
  country text NOT NULL,
  issuance_date date NOT NULL,
  maturity_date date,
  tenure_years numeric,
  rating text,
  interest_rate numeric,
  rate_type text CHECK (rate_type IN ('Fixed', 'Floating', 'N/A')),
  reference_rate text,
  dividend_rate numeric,
  has_warrants boolean DEFAULT false,
  warrant_details text,
  has_conversion boolean DEFAULT false,
  conversion_details text,
  seniority text,
  preference_elements text,
  current_status text NOT NULL DEFAULT 'performing',
  closure_type text CHECK (closure_type IN ('fully-satisfied', 'with-restructuring', 'partial-loss', 'complete-loss')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_schedules table
CREATE TABLE IF NOT EXISTS payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  payment_due_date date NOT NULL,
  principal_due numeric DEFAULT 0,
  interest_due numeric DEFAULT 0,
  total_due numeric NOT NULL,
  payment_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  payment_date date NOT NULL,
  amount_paid numeric NOT NULL,
  principal_paid numeric DEFAULT 0,
  interest_paid numeric DEFAULT 0,
  amount_due numeric NOT NULL,
  payment_status text NOT NULL CHECK (payment_status IN ('on-time', 'late', 'partial', 'missed')),
  deficit_amount numeric DEFAULT 0,
  penalty_applied numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create financial_snapshots table
CREATE TABLE IF NOT EXISTS financial_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  quarter text NOT NULL,
  snapshot_date date NOT NULL,
  revenue numeric DEFAULT 0,
  ebit numeric DEFAULT 0,
  ebitda numeric DEFAULT 0,
  interest_expense numeric DEFAULT 0,
  capex numeric DEFAULT 0,
  customer_growth_rate numeric DEFAULT 0,
  churn_rate numeric DEFAULT 0,
  cash_balance numeric DEFAULT 0,
  debt_outstanding numeric DEFAULT 0,
  input_cost_gas numeric DEFAULT 0,
  input_cost_electricity numeric DEFAULT 0,
  input_cost_materials numeric DEFAULT 0,
  input_cost_wages numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create watchlist_metrics table
CREATE TABLE IF NOT EXISTS watchlist_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE UNIQUE NOT NULL,
  dscr_current numeric,
  dscr_covenant numeric,
  dscr_trend text CHECK (dscr_trend IN ('improving', 'stable', 'declining')),
  liquidity_days numeric,
  covenant_headroom_pct numeric,
  cash_runway_months numeric,
  revenue_vs_plan_pct numeric,
  last_reporting_date date,
  reporting_quality text CHECK (reporting_quality IN ('on-time', 'delayed', 'incomplete')),
  sponsor_support_status text CHECK (sponsor_support_status IN ('committed', 'uncertain', 'withdrawn')),
  risk_score numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Create project_status_history table
CREATE TABLE IF NOT EXISTS project_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL,
  sub_status text,
  status_date date NOT NULL DEFAULT CURRENT_DATE,
  changed_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create monitoring_rules table
CREATE TABLE IF NOT EXISTS monitoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  industry_sector text,
  country text,
  instrument_type text,
  rating_threshold text,
  dscr_warning_level numeric DEFAULT 1.2,
  dscr_critical_level numeric DEFAULT 1.0,
  liquidity_warning_days numeric DEFAULT 90,
  liquidity_critical_days numeric DEFAULT 60,
  review_frequency text DEFAULT 'quarterly',
  escalation_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create support_network_contacts table
CREATE TABLE IF NOT EXISTS support_network_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  team_type text NOT NULL CHECK (team_type IN ('Sector', 'Country', 'Credit', 'Finance', 'Treasury', 'Communications', 'Policy', 'Legal', 'Remediation', 'IT')),
  contact_name text NOT NULL,
  contact_title text,
  contact_phone text,
  contact_email text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_issuer ON projects(issuer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(current_status);
CREATE INDEX IF NOT EXISTS idx_projects_country ON projects(country);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_project ON payment_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_project ON payment_history(project_id);
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_project ON financial_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_project_status_history_project ON project_status_history(project_id);
CREATE INDEX IF NOT EXISTS idx_support_network_project ON support_network_contacts(project_id);

-- Enable Row Level Security
ALTER TABLE issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_network_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for issuers
CREATE POLICY "Users can view all issuers"
  ON issuers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert issuers"
  ON issuers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update issuers"
  ON issuers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete issuers"
  ON issuers FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for projects
CREATE POLICY "Users can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for payment_schedules
CREATE POLICY "Users can view all payment schedules"
  ON payment_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert payment schedules"
  ON payment_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update payment schedules"
  ON payment_schedules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete payment schedules"
  ON payment_schedules FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for payment_history
CREATE POLICY "Users can view all payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert payment history"
  ON payment_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update payment history"
  ON payment_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete payment history"
  ON payment_history FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for financial_snapshots
CREATE POLICY "Users can view all financial snapshots"
  ON financial_snapshots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert financial snapshots"
  ON financial_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update financial snapshots"
  ON financial_snapshots FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete financial snapshots"
  ON financial_snapshots FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for watchlist_metrics
CREATE POLICY "Users can view all watchlist metrics"
  ON watchlist_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert watchlist metrics"
  ON watchlist_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update watchlist metrics"
  ON watchlist_metrics FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete watchlist metrics"
  ON watchlist_metrics FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for project_status_history
CREATE POLICY "Users can view all project status history"
  ON project_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert project status history"
  ON project_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update project status history"
  ON project_status_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete project status history"
  ON project_status_history FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for monitoring_rules
CREATE POLICY "Users can view all monitoring rules"
  ON monitoring_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert monitoring rules"
  ON monitoring_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update monitoring rules"
  ON monitoring_rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete monitoring rules"
  ON monitoring_rules FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for support_network_contacts
CREATE POLICY "Users can view all support contacts"
  ON support_network_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert support contacts"
  ON support_network_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update support contacts"
  ON support_network_contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete support contacts"
  ON support_network_contacts FOR DELETE
  TO authenticated
  USING (true);