/*
  # Add Cash Flow Forecasts, Covenant Tracking, and Stakeholder Mapping

  1. New Tables
    - `cash_flow_forecasts`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `week_number` (integer, 1-13)
      - `week_start_date` (date)
      - `projected_inflows` (numeric)
      - `projected_outflows` (numeric)
      - `projected_net_cash_flow` (numeric)
      - `projected_ending_balance` (numeric)
      - `actual_inflows` (numeric, nullable)
      - `actual_outflows` (numeric, nullable)
      - `actual_net_cash_flow` (numeric, nullable)
      - `actual_ending_balance` (numeric, nullable)
      - `variance` (numeric, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `covenants`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `covenant_name` (text)
      - `covenant_type` (text: 'DSCR', 'Debt-to-Equity', 'Interest Coverage', 'Minimum Cash', 'Current Ratio', 'Fixed Charge Coverage', 'Other')
      - `threshold_value` (numeric)
      - `threshold_operator` (text: '>=', '<=', '>', '<')
      - `current_value` (numeric, nullable)
      - `headroom_pct` (numeric, nullable)
      - `trend` (text: 'improving', 'stable', 'declining', nullable)
      - `last_tested_date` (date, nullable)
      - `testing_frequency` (text: 'quarterly', 'semi-annual', 'annual')
      - `breach_consequence` (text, nullable)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `stakeholders`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `stakeholder_type` (text: 'creditor', 'shareholder', 'board_member', 'management', 'sponsor', 'advisor')
      - `name` (text)
      - `organization` (text, nullable)
      - `position_title` (text, nullable)
      - `ownership_pct` (numeric, nullable)
      - `voting_power_pct` (numeric, nullable)
      - `priority_rank` (integer, nullable)
      - `seniority_level` (text: 'senior-secured', 'senior-unsecured', 'subordinated', 'equity-preferred', 'equity-common', nullable)
      - `alignment` (text: 'supportive', 'neutral', 'resistant', 'unknown')
      - `influence_level` (text: 'high', 'medium', 'low')
      - `email` (text, nullable)
      - `phone` (text, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to read data
    - For demonstration purposes, allow all operations (in production, would restrict by role)
*/

-- Create cash_flow_forecasts table
CREATE TABLE IF NOT EXISTS cash_flow_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  week_number integer NOT NULL CHECK (week_number >= 1 AND week_number <= 13),
  week_start_date date NOT NULL,
  projected_inflows numeric(15,2) DEFAULT 0,
  projected_outflows numeric(15,2) DEFAULT 0,
  projected_net_cash_flow numeric(15,2) DEFAULT 0,
  projected_ending_balance numeric(15,2) DEFAULT 0,
  actual_inflows numeric(15,2),
  actual_outflows numeric(15,2),
  actual_net_cash_flow numeric(15,2),
  actual_ending_balance numeric(15,2),
  variance numeric(15,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, week_number)
);

-- Create covenants table
CREATE TABLE IF NOT EXISTS covenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  covenant_name text NOT NULL,
  covenant_type text NOT NULL CHECK (covenant_type IN ('DSCR', 'Debt-to-Equity', 'Interest Coverage', 'Minimum Cash', 'Current Ratio', 'Fixed Charge Coverage', 'Other')),
  threshold_value numeric(10,2) NOT NULL,
  threshold_operator text NOT NULL CHECK (threshold_operator IN ('>=', '<=', '>', '<')) DEFAULT '>=',
  current_value numeric(10,2),
  headroom_pct numeric(5,2),
  trend text CHECK (trend IN ('improving', 'stable', 'declining')),
  last_tested_date date,
  testing_frequency text NOT NULL CHECK (testing_frequency IN ('quarterly', 'semi-annual', 'annual')) DEFAULT 'quarterly',
  breach_consequence text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stakeholders table
CREATE TABLE IF NOT EXISTS stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  stakeholder_type text NOT NULL CHECK (stakeholder_type IN ('creditor', 'shareholder', 'board_member', 'management', 'sponsor', 'advisor')),
  name text NOT NULL,
  organization text,
  position_title text,
  ownership_pct numeric(5,2) CHECK (ownership_pct >= 0 AND ownership_pct <= 100),
  voting_power_pct numeric(5,2) CHECK (voting_power_pct >= 0 AND voting_power_pct <= 100),
  priority_rank integer,
  seniority_level text CHECK (seniority_level IN ('senior-secured', 'senior-unsecured', 'subordinated', 'equity-preferred', 'equity-common')),
  alignment text NOT NULL CHECK (alignment IN ('supportive', 'neutral', 'resistant', 'unknown')) DEFAULT 'unknown',
  influence_level text NOT NULL CHECK (influence_level IN ('high', 'medium', 'low')) DEFAULT 'medium',
  email text,
  phone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cash_flow_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE covenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;

-- Create policies for cash_flow_forecasts
CREATE POLICY "Allow public read access to cash_flow_forecasts"
  ON cash_flow_forecasts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to cash_flow_forecasts"
  ON cash_flow_forecasts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to cash_flow_forecasts"
  ON cash_flow_forecasts FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to cash_flow_forecasts"
  ON cash_flow_forecasts FOR DELETE
  TO public
  USING (true);

-- Create policies for covenants
CREATE POLICY "Allow public read access to covenants"
  ON covenants FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to covenants"
  ON covenants FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to covenants"
  ON covenants FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to covenants"
  ON covenants FOR DELETE
  TO public
  USING (true);

-- Create policies for stakeholders
CREATE POLICY "Allow public read access to stakeholders"
  ON stakeholders FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to stakeholders"
  ON stakeholders FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to stakeholders"
  ON stakeholders FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to stakeholders"
  ON stakeholders FOR DELETE
  TO public
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cash_flow_forecasts_project_id ON cash_flow_forecasts(project_id);
CREATE INDEX IF NOT EXISTS idx_covenants_project_id ON covenants(project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_covenants_is_active ON covenants(is_active);
CREATE INDEX IF NOT EXISTS idx_stakeholders_type ON stakeholders(stakeholder_type);