export interface Issuer {
  id: string;
  unique_issuer_id: string;
  name: string;
  issuer_type: 'Public' | 'Private';
  industry_sector: string;
  country: string;
  contact_name: string | null;
  contact_title: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  unique_project_id: string;
  project_name: string;
  issuer_id: string;
  instrument_type: string;
  deal_size: number;
  issuance_currency: string;
  country: string;
  issuance_date: string;
  maturity_date: string | null;
  tenure_years: number | null;
  rating: string | null;
  interest_rate: number | null;
  rate_type: 'Fixed' | 'Floating' | 'N/A' | null;
  reference_rate: string | null;
  dividend_rate: number | null;
  has_warrants: boolean;
  warrant_details: string | null;
  has_conversion: boolean;
  conversion_details: string | null;
  seniority: string | null;
  preference_elements: string | null;
  current_status: 'performing' | 'watch-list' | 'remediation-required' | 'closed';
  closure_type: 'fully-satisfied' | 'with-restructuring' | 'partial-loss' | 'complete-loss' | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithIssuer extends Project {
  issuer: Issuer;
}

export interface PaymentSchedule {
  id: string;
  project_id: string;
  payment_due_date: string;
  principal_due: number;
  interest_due: number;
  total_due: number;
  payment_type: string;
  created_at: string;
}

export interface PaymentHistory {
  id: string;
  project_id: string;
  payment_date: string;
  amount_paid: number;
  principal_paid: number;
  interest_paid: number;
  amount_due: number;
  payment_status: 'on-time' | 'late' | 'partial' | 'missed';
  deficit_amount: number;
  penalty_applied: number;
  notes: string | null;
  created_at: string;
}

export interface FinancialSnapshot {
  id: string;
  project_id: string;
  quarter: string;
  snapshot_date: string;
  revenue: number;
  ebit: number;
  ebitda: number;
  interest_expense: number;
  capex: number;
  customer_growth_rate: number;
  churn_rate: number;
  cash_balance: number;
  debt_outstanding: number;
  input_cost_gas: number;
  input_cost_electricity: number;
  input_cost_materials: number;
  input_cost_wages: number;
  created_at: string;
}

export interface WatchlistMetrics {
  id: string;
  project_id: string;
  dscr_current: number | null;
  dscr_covenant: number | null;
  dscr_trend: 'improving' | 'stable' | 'declining' | null;
  liquidity_days: number | null;
  covenant_headroom_pct: number | null;
  cash_runway_months: number | null;
  revenue_vs_plan_pct: number | null;
  last_reporting_date: string | null;
  reporting_quality: 'on-time' | 'delayed' | 'incomplete' | null;
  sponsor_support_status: 'committed' | 'uncertain' | 'withdrawn' | null;
  risk_score: number;
  updated_at: string;
}

export interface ProjectStatusHistory {
  id: string;
  project_id: string;
  status: string;
  sub_status: string | null;
  status_date: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface MonitoringRule {
  id: string;
  rule_name: string;
  industry_sector: string | null;
  country: string | null;
  instrument_type: string | null;
  rating_threshold: string | null;
  dscr_warning_level: number;
  dscr_critical_level: number;
  liquidity_warning_days: number;
  liquidity_critical_days: number;
  review_frequency: string;
  escalation_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportNetworkContact {
  id: string;
  project_id: string;
  team_type: 'Sector' | 'Country' | 'Credit' | 'Finance' | 'Treasury' | 'Communications' | 'Policy' | 'Legal' | 'Remediation' | 'IT';
  contact_name: string;
  contact_title: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDiary {
  id: string;
  project_id: string;
  entry_date: string;
  entry_text: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectReminder {
  id: string;
  project_id: string;
  reminder_date: string;
  description: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectAlert {
  id: string;
  project_id: string;
  alert_date: string;
  description: string;
  is_read: boolean;
  created_from_reminder_id: string | null;
  created_at: string;
  project?: Project;
}

export interface CashFlowForecast {
  id: string;
  project_id: string;
  week_number: number;
  week_start_date: string;
  projected_inflows: number;
  projected_outflows: number;
  projected_net_cash_flow: number;
  projected_ending_balance: number;
  actual_inflows: number | null;
  actual_outflows: number | null;
  actual_net_cash_flow: number | null;
  actual_ending_balance: number | null;
  variance: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Covenant {
  id: string;
  project_id: string;
  covenant_name: string;
  covenant_type: 'DSCR' | 'Debt-to-Equity' | 'Interest Coverage' | 'Minimum Cash' | 'Current Ratio' | 'Fixed Charge Coverage' | 'Other';
  threshold_value: number;
  threshold_operator: '>=' | '<=' | '>' | '<';
  current_value: number | null;
  headroom_pct: number | null;
  trend: 'improving' | 'stable' | 'declining' | null;
  last_tested_date: string | null;
  testing_frequency: 'quarterly' | 'semi-annual' | 'annual';
  breach_consequence: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stakeholder {
  id: string;
  project_id: string;
  stakeholder_type: 'creditor' | 'shareholder' | 'board_member' | 'management' | 'sponsor' | 'advisor';
  name: string;
  organization: string | null;
  position_title: string | null;
  ownership_pct: number | null;
  voting_power_pct: number | null;
  priority_rank: number | null;
  seniority_level: 'senior-secured' | 'senior-unsecured' | 'subordinated' | 'equity-preferred' | 'equity-common' | null;
  alignment: 'supportive' | 'neutral' | 'resistant' | 'unknown';
  influence_level: 'high' | 'medium' | 'low';
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
