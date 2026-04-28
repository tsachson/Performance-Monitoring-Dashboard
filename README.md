# Major Bank Investment Monitoring Management Tool

A comprehensive investment portfolio monitoring and management system designed for multinational large banks and institutional investors. This application provides real-time tracking, risk assessment, and performance monitoring for debt and equity investments.

## Features

### Dashboard & Overview
- **Executive Dashboard**: High-level portfolio overview with key metrics and performance indicators
- **Real-time Alerts**: Automated notifications for projects requiring attention
- **Portfolio Analytics**: Comprehensive metrics including DSCR, cash runway, and revenue tracking

### Investment Monitoring
- **Performing Projects**: Track healthy investments meeting performance thresholds
- **Watchlist Monitoring**: Early identification and monitoring of stressed exposures with customizable health status filters
- **Remediation Workspace**: Dedicated workspace for managing distressed investments with action tracking

### Project Management
- **Project Details**: In-depth project information including issuer details, financial metrics, and status tracking
- **Project Diary**: Chronological record of key events, meetings, and decisions
- **Reminders System**: Set and track follow-up actions and important dates
- **Contact Management**: Maintain relationships with project sponsors and stakeholders
- **Workout Plans**: Create and track remediation action plans for distressed investments
- **Covenant Tracking**: Monitor financial covenant compliance with automated breach detection
- **Cash Flow Forecasting**: Project-level cash flow analysis with scenario planning
- **Stakeholder Mapping**: Track key stakeholders, their influence, and engagement strategies

### Research & Analysis
- **Precedents Search**: Search and analyze historical project outcomes and resolutions
- **Export Capabilities**: Generate reports in multiple formats for stakeholder distribution

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Netlify-ready with `_redirects` configuration

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- A Supabase account and project

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mdb-investment-monitoring.git
cd mdb-investment-monitoring
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run database migrations:
   - Navigate to your Supabase project dashboard
   - Go to the SQL Editor
   - Run the migration files in order from the `supabase/migrations` directory

5. (Optional) Seed the database with sample data:
```bash
npm run seed
```

## Configuration

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key from Project Settings > API
3. Run the migrations in the `supabase/migrations` directory in order:
   - `20251230173358_create_mdb_investment_schema.sql`
   - `20251230173804_update_rls_policies_for_public_access.sql`
   - `20251230230127_add_diaries_reminders_alerts.sql`
   - `20251231015830_fix_diary_reminders_alerts_policy_names.sql`
   - `20251231022818_update_risk_score_for_remediation_only.sql`
   - `20251231160849_add_workout_punchlist_saves.sql`
   - `20251231174913_add_closure_type_constraint.sql`
   - `20251231224846_add_cash_flow_covenant_stakeholder_tables.sql`

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Usage

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

### Linting

Run ESLint to check code quality:
```bash
npm run lint
```

### Type Checking

Run TypeScript type checking:
```bash
npm run typecheck
```

## Database Schema

The application uses the following main tables:

- **issuers**: Companies and organizations receiving investments
- **projects**: Individual investment projects with financial metrics
- **contacts**: Stakeholder contact information
- **watchlist_metrics**: Performance metrics for investment monitoring
- **project_diaries**: Historical records and notes
- **reminders**: Follow-up tasks and deadlines
- **alerts**: System-generated notifications
- **workout_plans**: Remediation strategies and action items for distressed projects
- **covenant_tracking**: Monitor financial covenant compliance and breaches
- **cash_flow_forecasts**: Project cash flow projections and scenarios
- **stakeholder_mapping**: Track key stakeholders and their influence on projects

All tables include Row Level Security (RLS) policies for data protection.

## Project Structure

```
mdb-investment-monitoring/
├── src/
│   ├── components/        # React components
│   │   ├── Dashboard.tsx
│   │   ├── AlertsTab.tsx
│   │   ├── PerformingProjects.tsx
│   │   ├── WatchlistMonitoring.tsx
│   │   ├── RemediationWorkspace.tsx
│   │   ├── ProjectsList.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── ProjectDiary.tsx
│   │   ├── ProjectReminders.tsx
│   │   ├── CovenantTracking.tsx
│   │   ├── CashFlowForecast.tsx
│   │   ├── StakeholderMapping.tsx
│   │   ├── PrecedentsSearch.tsx
│   │   └── ...
│   ├── lib/              # Utilities and helpers
│   │   ├── supabase.ts
│   │   ├── projectStatus.ts
│   │   ├── statusTracking.ts
│   │   └── dscrCalculation.ts
│   ├── types/            # TypeScript type definitions
│   │   └── database.ts
│   ├── App.tsx           # Main application component
│   └── main.tsx          # Application entry point
├── supabase/
│   └── migrations/       # Database migrations
├── public/               # Static assets
└── dist/                 # Production build output
```

## Key Features Explained

### Investment Status Classification

Projects are automatically classified based on performance metrics:

**Debt Investments:**
- Performing: DSCR ≥ 1.20x
- Watchlist: 1.00x ≤ DSCR < 1.20x
- Remediation: DSCR < 1.00x

**Equity Investments:**
- Performing: Cash runway ≥ 12 months
- Watchlist: 6-11 months runway
- Remediation: < 6 months runway

### Health Status Indicators

The watchlist monitoring system evaluates project health based on:
- Revenue vs. plan performance
- Reporting quality and timeliness
- Sponsor support status
- Financial covenant compliance

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure your code follows the existing style and passes all linting checks.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

**Thomas Sachson www.AgenticYears.com**

## Acknowledgments

- Built with React and TypeScript
- Powered by Supabase
- Icons by Lucide
- Styled with Tailwind CSS

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

Made with care for institutional investment management.
