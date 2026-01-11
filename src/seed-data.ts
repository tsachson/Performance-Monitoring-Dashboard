import { faker } from '@faker-js/faker';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const INDUSTRY_SECTORS = [
  'Telecom', 'Infrastructure', 'Health', 'Environmental', 'Technology',
  'Education', 'Transport', 'Energy', 'Real Estate', 'Entertainment',
  'Media', 'Biotech', 'Agriculture', 'Defense', 'Water & Sanitation',
  'Renewable Energy', 'Manufacturing', 'Financial Services'
];

const COUNTRIES = [
  'Philippines', 'Indonesia', 'Vietnam', 'Thailand', 'Malaysia',
  'Singapore', 'India', 'Bangladesh', 'Pakistan', 'Sri Lanka',
  'Myanmar', 'Cambodia', 'Laos', 'Nepal', 'Mongolia',
  'China', 'Japan', 'South Korea', 'Taiwan', 'Kazakhstan'
];

const INSTRUMENT_TYPES = {
  debt: [
    'Senior Secured Debt',
    'Senior Unsecured Debt',
    'Subordinated Debt',
    'Convertible Debt',
    'Green Bonds',
    'Social Bonds',
    'Project Bonds'
  ],
  equity: [
    'Common Equity',
    'Preferred Equity',
    'Equity with Warrants'
  ]
};

const RATINGS = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-'];
const CURRENCIES = ['USD', 'EUR', 'JPY', 'SGD', 'PHP', 'INR', 'THB', 'MYR'];
const TEAM_TYPES = ['Sector', 'Country', 'Credit', 'Finance', 'Treasury', 'Communications', 'Policy', 'Legal', 'Remediation', 'IT'];

const PROJECT_STATUSES = ['performing', 'watch-list', 'remediation-required', 'closed'];
const CLOSURE_TYPES = ['fully-satisfied', 'with-restructuring', 'partial-loss', 'complete-loss'];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateIssuanceDate(): Date {
  const yearsAgo = randomInt(1, 15);
  const date = new Date();
  date.setFullYear(date.getFullYear() - yearsAgo);
  date.setMonth(randomInt(0, 11));
  date.setDate(randomInt(1, 28));
  return date;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getQuarterString(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter}-${date.getFullYear()}`;
}

async function seedDatabase() {
  console.log('Starting database seeding...');

  console.log('Clearing existing data...');
  await supabase.from('cash_flow_forecasts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('covenants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('stakeholders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('support_network_contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('watchlist_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('project_status_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('financial_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('payment_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('payment_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('monitoring_rules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('issuers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Existing data cleared.');

  const issuers: any[] = [];
  const projects: any[] = [];

  console.log('Generating 200 projects with issuers...');

  for (let i = 0; i < 200; i++) {
    const isDebt = Math.random() > 0.3;
    const sector = randomElement(INDUSTRY_SECTORS);
    const country = randomElement(COUNTRIES);
    const issuerType = Math.random() > 0.4 ? 'Private' : 'Public';

    const issuer = {
      unique_issuer_id: `ISS-${String(i + 1).padStart(5, '0')}`,
      name: faker.company.name(),
      issuer_type: issuerType,
      industry_sector: sector,
      country: country,
      contact_name: faker.person.fullName(),
      contact_title: faker.person.jobTitle(),
      contact_phone: faker.phone.number(),
      contact_email: faker.internet.email()
    };
    issuers.push(issuer);

    const issuanceDate = generateIssuanceDate();
    const tenureYears = isDebt ? randomInt(5, 20) : null;
    const maturityDate = tenureYears ? addYears(issuanceDate, tenureYears) : null;
    const isClosed = Math.random() < 0.25;
    const isWatchlist = !isClosed && Math.random() < 0.15;
    const isRemediation = !isClosed && !isWatchlist && Math.random() < 0.08;

    let currentStatus = 'performing';
    let closureType = null;

    if (isClosed) {
      currentStatus = 'closed';
      closureType = randomElement(CLOSURE_TYPES);
    } else if (isRemediation) {
      currentStatus = 'remediation-required';
    } else if (isWatchlist) {
      currentStatus = 'watch-list';
    }

    const dealSize = randomFloat(5000000, 500000000, 0);
    const instrumentType = isDebt
      ? randomElement(INSTRUMENT_TYPES.debt)
      : randomElement(INSTRUMENT_TYPES.equity);

    const hasWarrants = !isDebt && Math.random() > 0.7;
    const hasConversion = instrumentType === 'Convertible Debt';

    const project = {
      unique_project_id: `PRJ-${String(i + 1).padStart(5, '0')}`,
      project_name: `${sector} Development - ${faker.location.city()}`,
      instrument_type: instrumentType,
      deal_size: dealSize,
      issuance_currency: randomElement(CURRENCIES),
      country: country,
      issuance_date: issuanceDate.toISOString().split('T')[0],
      maturity_date: maturityDate?.toISOString().split('T')[0],
      tenure_years: tenureYears,
      rating: isDebt ? randomElement(RATINGS) : null,
      interest_rate: isDebt ? randomFloat(3, 12, 2) : null,
      rate_type: isDebt ? (Math.random() > 0.6 ? 'Fixed' : 'Floating') : 'N/A',
      reference_rate: isDebt && Math.random() < 0.4 ? randomElement(['SOFR', 'LIBOR', 'EURIBOR']) : null,
      dividend_rate: !isDebt ? randomFloat(5, 15, 2) : null,
      has_warrants: hasWarrants,
      warrant_details: hasWarrants ? 'Warrants to purchase 10% additional equity at strike price' : null,
      has_conversion: hasConversion,
      conversion_details: hasConversion ? 'Convertible to equity at maturity or upon trigger events' : null,
      seniority: isDebt ? randomElement(['Senior Secured', 'Senior Unsecured', 'Subordinated']) : null,
      preference_elements: !isDebt && Math.random() > 0.5 ? 'Liquidation preference 1.5x' : null,
      current_status: currentStatus,
      closure_type: closureType,
      issuer_unique_id: issuer.unique_issuer_id
    };
    projects.push(project);
  }

  console.log('Inserting issuers into database...');
  const { data: insertedIssuers, error: issuersError } = await supabase
    .from('issuers')
    .insert(issuers)
    .select();

  if (issuersError) {
    console.error('Error inserting issuers:', issuersError);
    return;
  }

  console.log(`Inserted ${insertedIssuers.length} issuers`);

  const issuerMap = new Map(
    insertedIssuers.map(issuer => [issuer.unique_issuer_id, issuer.id])
  );

  const projectsWithIssuerIds = projects.map(project => {
    const { issuer_unique_id, ...projectData } = project;
    return {
      ...projectData,
      issuer_id: issuerMap.get(issuer_unique_id)
    };
  });

  console.log('Inserting projects into database...');
  const { data: insertedProjects, error: projectsError } = await supabase
    .from('projects')
    .insert(projectsWithIssuerIds)
    .select();

  if (projectsError) {
    console.error('Error inserting projects:', projectsError);
    return;
  }

  console.log(`Inserted ${insertedProjects.length} projects`);

  console.log('Generating payment schedules and history...');
  const paymentSchedules: any[] = [];
  const paymentHistory: any[] = [];

  for (const project of insertedProjects) {
    if (project.instrument_type.includes('Debt')) {
      const issuanceDate = new Date(project.issuance_date);
      const maturityDate = new Date(project.maturity_date);
      const monthsDuration = Math.floor((maturityDate.getTime() - issuanceDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

      const principalPerPayment = project.deal_size / (monthsDuration / 6);
      const interestRate = project.interest_rate / 100 / 2;

      let currentDate = addMonths(issuanceDate, 6);
      let remainingPrincipal = project.deal_size;

      while (currentDate <= maturityDate && currentDate <= new Date()) {
        const interestDue = remainingPrincipal * interestRate;
        const principalDue = currentDate.getTime() === maturityDate.getTime() ? remainingPrincipal : principalPerPayment;

        paymentSchedules.push({
          project_id: project.id,
          payment_due_date: currentDate.toISOString().split('T')[0],
          principal_due: principalDue,
          interest_due: interestDue,
          total_due: principalDue + interestDue,
          payment_type: 'principal-and-interest'
        });

        const isPaid = currentDate < new Date();
        if (isPaid) {
          const isOnTime = project.current_status !== 'closed' || project.closure_type === 'fully-satisfied'
            ? Math.random() > 0.15
            : Math.random() > 0.5;

          const paymentDate = isOnTime
            ? currentDate
            : new Date(currentDate.getTime() + randomInt(1, 30) * 24 * 60 * 60 * 1000);

          const paymentFactor = isOnTime ? randomFloat(0.98, 1.0) : randomFloat(0.5, 0.95);
          const principalPaid = principalDue * paymentFactor;
          const interestPaid = interestDue * paymentFactor;
          const amountPaid = principalPaid + interestPaid;
          const deficit = (principalDue + interestDue) - amountPaid;

          paymentHistory.push({
            project_id: project.id,
            payment_date: paymentDate.toISOString().split('T')[0],
            amount_paid: amountPaid,
            principal_paid: principalPaid,
            interest_paid: interestPaid,
            amount_due: principalDue + interestDue,
            payment_status: isOnTime && paymentFactor > 0.95 ? 'on-time' : deficit > 0 ? 'partial' : 'late',
            deficit_amount: Math.max(0, deficit),
            penalty_applied: deficit > 0 ? deficit * 0.02 : 0,
            notes: !isOnTime ? 'Payment delayed' : null
          });

          remainingPrincipal -= principalPaid;
        }

        currentDate = addMonths(currentDate, 6);
      }
    }
  }

  if (paymentSchedules.length > 0) {
    console.log('Inserting payment schedules...');
    const { error: schedulesError } = await supabase
      .from('payment_schedules')
      .insert(paymentSchedules);

    if (schedulesError) {
      console.error('Error inserting payment schedules:', schedulesError);
    } else {
      console.log(`Inserted ${paymentSchedules.length} payment schedules`);
    }
  }

  if (paymentHistory.length > 0) {
    console.log('Inserting payment history...');
    const { error: historyError } = await supabase
      .from('payment_history')
      .insert(paymentHistory);

    if (historyError) {
      console.error('Error inserting payment history:', historyError);
    } else {
      console.log(`Inserted ${paymentHistory.length} payment history records`);
    }
  }

  console.log('Generating financial snapshots (last 4 quarters)...');
  const financialSnapshots: any[] = [];

  for (const project of insertedProjects) {
    const baseRevenue = project.deal_size * randomFloat(0.1, 0.3);

    for (let q = 3; q >= 0; q--) {
      const snapshotDate = new Date();
      snapshotDate.setMonth(snapshotDate.getMonth() - (q * 3));

      const growthFactor = project.current_status === 'performing'
        ? 1 + (3 - q) * 0.05
        : 1 - (3 - q) * 0.03;

      const revenue = baseRevenue * growthFactor * randomFloat(0.95, 1.05);
      const ebitda = revenue * randomFloat(0.25, 0.45);
      const ebit = ebitda * randomFloat(0.85, 0.95);
      const interestExpense = project.interest_rate
        ? project.deal_size * (project.interest_rate / 100) / 4
        : 0;
      const capex = revenue * randomFloat(0.05, 0.15);

      financialSnapshots.push({
        project_id: project.id,
        quarter: getQuarterString(snapshotDate),
        snapshot_date: snapshotDate.toISOString().split('T')[0],
        revenue: revenue,
        ebit: ebit,
        ebitda: ebitda,
        interest_expense: interestExpense,
        capex: capex,
        customer_growth_rate: randomFloat(-5, 15),
        churn_rate: randomFloat(1, 8),
        cash_balance: revenue * randomFloat(0.1, 0.3),
        debt_outstanding: project.deal_size * randomFloat(0.6, 0.95),
        input_cost_gas: randomFloat(50000, 500000),
        input_cost_electricity: randomFloat(30000, 300000),
        input_cost_materials: randomFloat(100000, 1000000),
        input_cost_wages: randomFloat(200000, 2000000)
      });
    }
  }

  console.log('Inserting financial snapshots...');
  const { error: snapshotsError } = await supabase
    .from('financial_snapshots')
    .insert(financialSnapshots);

  if (snapshotsError) {
    console.error('Error inserting financial snapshots:', snapshotsError);
  } else {
    console.log(`Inserted ${financialSnapshots.length} financial snapshots`);
  }

  console.log('Generating watchlist metrics...');
  const watchlistMetrics: any[] = [];

  for (const project of insertedProjects) {
    if (project.current_status !== 'closed') {
      const latestSnapshot = financialSnapshots
        .filter(s => s.project_id === project.id)
        .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime())[0];

      const isDebtInstrument = project.instrument_type.includes('Debt');
      const dscr = isDebtInstrument && latestSnapshot && latestSnapshot.interest_expense > 0
        ? (latestSnapshot.ebitda - latestSnapshot.capex) / latestSnapshot.interest_expense
        : isDebtInstrument
          ? randomFloat(0.8, 2.5)
          : null;

      const isStressed = project.current_status === 'watch-list' || project.current_status === 'remediation-required';

      watchlistMetrics.push({
        project_id: project.id,
        dscr_current: dscr,
        dscr_covenant: isDebtInstrument ? 1.2 : null,
        dscr_trend: dscr !== null ? (dscr > 1.3 ? 'improving' : dscr < 1.0 ? 'declining' : 'stable') : null,
        liquidity_days: randomInt(30, 180),
        covenant_headroom_pct: randomFloat(-10, 40),
        cash_runway_months: !project.instrument_type.includes('Debt') ? randomInt(6, 24) : null,
        revenue_vs_plan_pct: randomFloat(isStressed ? 60 : 90, isStressed ? 95 : 110),
        last_reporting_date: new Date().toISOString().split('T')[0],
        reporting_quality: isStressed && Math.random() > 0.7 ? 'delayed' : 'on-time',
        sponsor_support_status: isStressed && Math.random() > 0.8 ? 'uncertain' : 'committed',
        risk_score: project.current_status === 'remediation-required' ? randomInt(40, 95) : null
      });
    }
  }

  if (watchlistMetrics.length > 0) {
    console.log('Inserting watchlist metrics...');
    const { error: metricsError } = await supabase
      .from('watchlist_metrics')
      .insert(watchlistMetrics);

    if (metricsError) {
      console.error('Error inserting watchlist metrics:', metricsError);
    } else {
      console.log(`Inserted ${watchlistMetrics.length} watchlist metrics`);
    }
  }

  console.log('Generating project status history...');
  const statusHistory: any[] = [];

  for (const project of insertedProjects) {
    const issuanceDate = new Date(project.issuance_date);

    statusHistory.push({
      project_id: project.id,
      status: 'performing',
      sub_status: 'initial-investment',
      status_date: issuanceDate.toISOString().split('T')[0],
      changed_by: 'System',
      notes: 'Initial project investment'
    });

    if (project.current_status === 'watch-list') {
      const watchlistDate = new Date();
      watchlistDate.setMonth(watchlistDate.getMonth() - randomInt(2, 6));

      statusHistory.push({
        project_id: project.id,
        status: 'watch-list',
        sub_status: 'elevated-monitoring',
        status_date: watchlistDate.toISOString().split('T')[0],
        changed_by: faker.person.fullName(),
        notes: 'DSCR trending below covenant threshold'
      });
    }

    if (project.current_status === 'remediation-required') {
      const watchlistDate = new Date();
      watchlistDate.setMonth(watchlistDate.getMonth() - randomInt(8, 12));

      statusHistory.push({
        project_id: project.id,
        status: 'watch-list',
        sub_status: 'elevated-monitoring',
        status_date: watchlistDate.toISOString().split('T')[0],
        changed_by: faker.person.fullName(),
        notes: 'Performance deteriorating'
      });

      const remediationDate = new Date();
      remediationDate.setMonth(remediationDate.getMonth() - randomInt(1, 4));

      statusHistory.push({
        project_id: project.id,
        status: 'remediation-required',
        sub_status: 'restructuring-negotiation',
        status_date: remediationDate.toISOString().split('T')[0],
        changed_by: faker.person.fullName(),
        notes: 'Covenant breach, initiating remediation process'
      });
    }

    if (project.current_status === 'closed') {
      const closureDate = project.maturity_date || new Date().toISOString().split('T')[0];

      statusHistory.push({
        project_id: project.id,
        status: 'closed',
        sub_status: project.closure_type,
        status_date: closureDate,
        changed_by: faker.person.fullName(),
        notes: project.closure_type === 'fully-satisfied'
          ? 'All obligations satisfied per original terms'
          : `Closed with ${project.closure_type.replace('-', ' ')}`
      });
    }
  }

  console.log('Inserting project status history...');
  const { error: statusError } = await supabase
    .from('project_status_history')
    .insert(statusHistory);

  if (statusError) {
    console.error('Error inserting project status history:', statusError);
  } else {
    console.log(`Inserted ${statusHistory.length} status history records`);
  }

  console.log('Generating monitoring rules...');
  const monitoringRules: any[] = [];

  for (const sector of INDUSTRY_SECTORS) {
    monitoringRules.push({
      rule_name: `${sector} Sector Standard Monitoring`,
      industry_sector: sector,
      country: null,
      instrument_type: 'debt',
      rating_threshold: 'BBB-',
      dscr_warning_level: 1.2,
      dscr_critical_level: 1.0,
      liquidity_warning_days: 90,
      liquidity_critical_days: 60,
      review_frequency: 'quarterly',
      escalation_required: false,
      is_active: true
    });
  }

  const highRiskCountries = ['Pakistan', 'Bangladesh', 'Myanmar', 'Nepal'];
  for (const country of highRiskCountries) {
    monitoringRules.push({
      rule_name: `${country} Enhanced Monitoring`,
      industry_sector: null,
      country: country,
      instrument_type: null,
      rating_threshold: 'BB+',
      dscr_warning_level: 1.35,
      dscr_critical_level: 1.15,
      liquidity_warning_days: 120,
      liquidity_critical_days: 90,
      review_frequency: 'monthly',
      escalation_required: true,
      is_active: true
    });
  }

  monitoringRules.push({
    rule_name: 'Subordinated Debt Enhanced Monitoring',
    industry_sector: null,
    country: null,
    instrument_type: 'Subordinated Debt',
    rating_threshold: 'BBB',
    dscr_warning_level: 1.5,
    dscr_critical_level: 1.25,
    liquidity_warning_days: 120,
    liquidity_critical_days: 90,
    review_frequency: 'quarterly',
    escalation_required: true,
    is_active: true
  });

  console.log('Inserting monitoring rules...');
  const { error: rulesError } = await supabase
    .from('monitoring_rules')
    .insert(monitoringRules);

  if (rulesError) {
    console.error('Error inserting monitoring rules:', rulesError);
  } else {
    console.log(`Inserted ${monitoringRules.length} monitoring rules`);
  }

  console.log('Generating support network contacts...');
  const supportContacts: any[] = [];

  for (const project of insertedProjects) {
    if (project.current_status !== 'closed') {
      const numContacts = randomInt(4, 8);
      const selectedTeams = faker.helpers.shuffle([...TEAM_TYPES]).slice(0, numContacts);

      selectedTeams.forEach((team, index) => {
        supportContacts.push({
          project_id: project.id,
          team_type: team,
          contact_name: faker.person.fullName(),
          contact_title: faker.person.jobTitle(),
          contact_phone: faker.phone.number(),
          contact_email: faker.internet.email(),
          is_primary: index === 0,
          notes: null
        });
      });
    }
  }

  console.log('Inserting support network contacts...');
  const { error: contactsError } = await supabase
    .from('support_network_contacts')
    .insert(supportContacts);

  if (contactsError) {
    console.error('Error inserting support contacts:', contactsError);
  } else {
    console.log(`Inserted ${supportContacts.length} support network contacts`);
  }

  console.log('Generating covenants for watchlist and remediation projects...');
  const covenants: any[] = [];

  for (const project of insertedProjects) {
    if (project.current_status === 'watch-list' || project.current_status === 'remediation-required') {
      const isDebtInstrument = project.instrument_type.includes('Debt');

      if (isDebtInstrument) {
        covenants.push({
          project_id: project.id,
          covenant_name: 'Minimum DSCR',
          covenant_type: 'DSCR',
          threshold_value: 1.2,
          threshold_operator: '>=',
          current_value: randomFloat(0.9, 1.5),
          headroom_pct: null,
          trend: randomElement(['improving', 'stable', 'declining']),
          last_tested_date: new Date().toISOString().split('T')[0],
          testing_frequency: 'quarterly',
          breach_consequence: 'Event of Default; Mandatory prepayment required',
          is_active: true
        });

        covenants.push({
          project_id: project.id,
          covenant_name: 'Debt-to-Equity Ratio',
          covenant_type: 'Debt-to-Equity',
          threshold_value: 3.0,
          threshold_operator: '<=',
          current_value: randomFloat(2.0, 4.5),
          headroom_pct: null,
          trend: randomElement(['improving', 'stable', 'declining']),
          last_tested_date: new Date().toISOString().split('T')[0],
          testing_frequency: 'semi-annual',
          breach_consequence: 'Restrictions on additional debt issuance',
          is_active: true
        });

        covenants.push({
          project_id: project.id,
          covenant_name: 'Minimum Cash Balance',
          covenant_type: 'Minimum Cash',
          threshold_value: randomFloat(5000000, 20000000),
          threshold_operator: '>=',
          current_value: randomFloat(3000000, 25000000),
          headroom_pct: null,
          trend: randomElement(['improving', 'stable', 'declining']),
          last_tested_date: new Date().toISOString().split('T')[0],
          testing_frequency: 'quarterly',
          breach_consequence: 'Cash sweep mechanism triggered',
          is_active: true
        });
      } else {
        covenants.push({
          project_id: project.id,
          covenant_name: 'Minimum Liquidity',
          covenant_type: 'Minimum Cash',
          threshold_value: randomFloat(2000000, 10000000),
          threshold_operator: '>=',
          current_value: randomFloat(1500000, 12000000),
          headroom_pct: null,
          trend: randomElement(['improving', 'stable', 'declining']),
          last_tested_date: new Date().toISOString().split('T')[0],
          testing_frequency: 'quarterly',
          breach_consequence: 'Board intervention; Operational restrictions',
          is_active: true
        });
      }
    }
  }

  for (const covenant of covenants) {
    if (covenant.current_value !== null && covenant.threshold_value !== null) {
      const current = covenant.current_value;
      const threshold = covenant.threshold_value;
      const operator = covenant.threshold_operator;

      if (operator === '>=') {
        covenant.headroom_pct = ((current - threshold) / threshold) * 100;
      } else if (operator === '<=') {
        covenant.headroom_pct = ((threshold - current) / threshold) * 100;
      }
    }
  }

  if (covenants.length > 0) {
    console.log('Inserting covenants...');
    const { error: covenantsError } = await supabase
      .from('covenants')
      .insert(covenants);

    if (covenantsError) {
      console.error('Error inserting covenants:', covenantsError);
    } else {
      console.log(`Inserted ${covenants.length} covenants`);
    }
  }

  console.log('Generating stakeholders for watchlist and remediation projects...');
  const stakeholders: any[] = [];

  for (const project of insertedProjects) {
    if (project.current_status === 'watch-list' || project.current_status === 'remediation-required') {
      const isDebtInstrument = project.instrument_type.includes('Debt');

      if (isDebtInstrument) {
        const numCreditors = randomInt(2, 4);
        for (let i = 0; i < numCreditors; i++) {
          stakeholders.push({
            project_id: project.id,
            stakeholder_type: 'creditor',
            name: faker.person.fullName(),
            organization: faker.company.name(),
            position_title: randomElement(['VP of Credit', 'Senior Credit Officer', 'Portfolio Manager', 'Managing Director']),
            ownership_pct: null,
            voting_power_pct: randomFloat(10, 40),
            priority_rank: i + 1,
            seniority_level: i === 0 ? 'senior-secured' : i === 1 ? 'senior-unsecured' : 'subordinated',
            alignment: randomElement(['supportive', 'neutral', 'resistant']),
            influence_level: i === 0 ? 'high' : i === 1 ? 'medium' : 'low',
            email: faker.internet.email(),
            phone: faker.phone.number(),
            notes: i === 0 ? 'Lead lender in syndicate' : null
          });
        }

        stakeholders.push({
          project_id: project.id,
          stakeholder_type: 'sponsor',
          name: faker.person.fullName(),
          organization: faker.company.name(),
          position_title: 'CEO',
          ownership_pct: randomFloat(15, 45),
          voting_power_pct: null,
          priority_rank: null,
          seniority_level: null,
          alignment: project.current_status === 'remediation-required' ? randomElement(['neutral', 'resistant']) : 'supportive',
          influence_level: 'high',
          email: faker.internet.email(),
          phone: faker.phone.number(),
          notes: 'Primary sponsor with funding commitments'
        });
      } else {
        const numShareholders = randomInt(3, 5);
        for (let i = 0; i < numShareholders; i++) {
          stakeholders.push({
            project_id: project.id,
            stakeholder_type: 'shareholder',
            name: faker.company.name(),
            organization: null,
            position_title: null,
            ownership_pct: randomFloat(5, 30),
            voting_power_pct: randomFloat(5, 35),
            priority_rank: i + 1,
            seniority_level: i < 2 ? 'equity-preferred' : 'equity-common',
            alignment: randomElement(['supportive', 'neutral', 'resistant']),
            influence_level: i === 0 ? 'high' : 'medium',
            email: faker.internet.email(),
            phone: null,
            notes: i === 0 ? 'Lead investor' : null
          });
        }
      }

      const numBoardMembers = randomInt(2, 4);
      for (let i = 0; i < numBoardMembers; i++) {
        stakeholders.push({
          project_id: project.id,
          stakeholder_type: 'board_member',
          name: faker.person.fullName(),
          organization: null,
          position_title: i === 0 ? 'Board Chair' : 'Board Member',
          ownership_pct: null,
          voting_power_pct: null,
          priority_rank: null,
          seniority_level: null,
          alignment: randomElement(['supportive', 'neutral']),
          influence_level: i === 0 ? 'high' : 'medium',
          email: faker.internet.email(),
          phone: faker.phone.number(),
          notes: null
        });
      }

      stakeholders.push({
        project_id: project.id,
        stakeholder_type: 'management',
        name: faker.person.fullName(),
        organization: null,
        position_title: 'CEO',
        ownership_pct: null,
        voting_power_pct: null,
        priority_rank: null,
        seniority_level: null,
        alignment: 'supportive',
        influence_level: 'high',
        email: faker.internet.email(),
        phone: faker.phone.number(),
        notes: 'Current CEO since 2020'
      });

      stakeholders.push({
        project_id: project.id,
        stakeholder_type: 'management',
        name: faker.person.fullName(),
        organization: null,
        position_title: 'CFO',
        ownership_pct: null,
        voting_power_pct: null,
        priority_rank: null,
        seniority_level: null,
        alignment: 'supportive',
        influence_level: 'high',
        email: faker.internet.email(),
        phone: faker.phone.number(),
        notes: null
      });
    }
  }

  if (stakeholders.length > 0) {
    console.log('Inserting stakeholders...');
    const { error: stakeholdersError } = await supabase
      .from('stakeholders')
      .insert(stakeholders);

    if (stakeholdersError) {
      console.error('Error inserting stakeholders:', stakeholdersError);
    } else {
      console.log(`Inserted ${stakeholders.length} stakeholders`);
    }
  }

  console.log('Generating 13-week cash flow forecasts for remediation projects...');
  const cashFlowForecasts: any[] = [];

  for (const project of insertedProjects) {
    if (project.current_status === 'remediation-required') {
      const startDate = new Date();
      let previousBalance = randomFloat(5000000, 50000000);

      for (let week = 1; week <= 13; week++) {
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(startDate.getDate() + (week - 1) * 7);

        const projectedInflows = randomFloat(1000000, 10000000);
        const projectedOutflows = randomFloat(800000, 9000000);
        const projectedNet = projectedInflows - projectedOutflows;
        const projectedEnding = previousBalance + projectedNet;

        const hasActuals = week <= 4;
        const actualInflows = hasActuals ? projectedInflows * randomFloat(0.85, 1.15) : null;
        const actualOutflows = hasActuals ? projectedOutflows * randomFloat(0.9, 1.1) : null;
        const actualNet = hasActuals && actualInflows !== null && actualOutflows !== null ? actualInflows - actualOutflows : null;
        const actualEnding = hasActuals && actualNet !== null ? previousBalance + actualNet : null;
        const variance = hasActuals && actualNet !== null ? actualNet - projectedNet : null;

        cashFlowForecasts.push({
          project_id: project.id,
          week_number: week,
          week_start_date: weekStartDate.toISOString().split('T')[0],
          projected_inflows: projectedInflows,
          projected_outflows: projectedOutflows,
          projected_net_cash_flow: projectedNet,
          projected_ending_balance: projectedEnding,
          actual_inflows: actualInflows,
          actual_outflows: actualOutflows,
          actual_net_cash_flow: actualNet,
          actual_ending_balance: actualEnding,
          variance: variance,
          notes: week === 4 && Math.random() > 0.5 ? 'Delayed customer payment impacted inflows' : null
        });

        previousBalance = actualEnding !== null ? actualEnding : projectedEnding;
      }
    }
  }

  if (cashFlowForecasts.length > 0) {
    console.log('Inserting cash flow forecasts...');
    const { error: cashFlowError } = await supabase
      .from('cash_flow_forecasts')
      .insert(cashFlowForecasts);

    if (cashFlowError) {
      console.error('Error inserting cash flow forecasts:', cashFlowError);
    } else {
      console.log(`Inserted ${cashFlowForecasts.length} cash flow forecast entries`);
    }
  }

  console.log('\n=== Seeding Complete ===');
  console.log(`Total Issuers: ${insertedIssuers.length}`);
  console.log(`Total Projects: ${insertedProjects.length}`);
  console.log(`Payment Schedules: ${paymentSchedules.length}`);
  console.log(`Payment History: ${paymentHistory.length}`);
  console.log(`Financial Snapshots: ${financialSnapshots.length}`);
  console.log(`Watchlist Metrics: ${watchlistMetrics.length}`);
  console.log(`Status History: ${statusHistory.length}`);
  console.log(`Monitoring Rules: ${monitoringRules.length}`);
  console.log(`Support Contacts: ${supportContacts.length}`);
  console.log(`Covenants: ${covenants.length}`);
  console.log(`Stakeholders: ${stakeholders.length}`);
  console.log(`Cash Flow Forecasts: ${cashFlowForecasts.length}`);
}

seedDatabase().catch(console.error);
