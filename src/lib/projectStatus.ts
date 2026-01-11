import { Project, WatchlistMetrics } from '../types/database';

export type ProjectStatus = 'performing' | 'watch-list' | 'remediation-required' | 'closed';

export const STATUS_THRESHOLDS = {
  DEBT: {
    PERFORMING_MIN_DSCR: 1.20,
    WATCHLIST_MIN_DSCR: 1.00,
  },
  EQUITY: {
    PERFORMING_MIN_RUNWAY: 12,
    WATCHLIST_MIN_RUNWAY: 6,
  },
} as const;

export function isDebtInstrument(instrumentType: string): boolean {
  return instrumentType.includes('Debt') || instrumentType.includes('Bonds') || instrumentType.includes('Loan');
}

export function isEquityInstrument(instrumentType: string): boolean {
  return instrumentType.includes('Equity') || instrumentType.includes('Shares');
}

export function calculateProjectStatus(
  project: Project,
  metrics: WatchlistMetrics | null | undefined
): ProjectStatus {
  if (project.current_status === 'closed') {
    return 'closed';
  }

  if (!metrics) {
    return project.current_status;
  }

  const isDebt = isDebtInstrument(project.instrument_type);
  const isEquity = isEquityInstrument(project.instrument_type);

  if (isDebt && metrics.dscr_current !== null) {
    const dscr = Number(metrics.dscr_current);

    if (dscr >= STATUS_THRESHOLDS.DEBT.PERFORMING_MIN_DSCR) {
      return 'performing';
    } else if (dscr >= STATUS_THRESHOLDS.DEBT.WATCHLIST_MIN_DSCR) {
      return 'watch-list';
    } else {
      return 'remediation-required';
    }
  }

  if (isEquity && metrics.cash_runway_months !== null) {
    const runway = Number(metrics.cash_runway_months);

    if (runway >= STATUS_THRESHOLDS.EQUITY.PERFORMING_MIN_RUNWAY) {
      return 'performing';
    } else if (runway >= STATUS_THRESHOLDS.EQUITY.WATCHLIST_MIN_RUNWAY) {
      return 'watch-list';
    } else {
      return 'remediation-required';
    }
  }

  return project.current_status;
}

export function getStatusDescription(status: ProjectStatus): string {
  switch (status) {
    case 'performing':
      return 'Healthy debt service coverage or comfortable cash runway';
    case 'watch-list':
      return 'Marginal metrics, requires enhanced monitoring';
    case 'remediation-required':
      return 'Critical metrics, immediate action required';
    case 'closed':
      return 'Project closed';
  }
}

export function getStatusThresholdInfo(instrumentType: string): string {
  const isDebt = isDebtInstrument(instrumentType);
  const isEquity = isEquityInstrument(instrumentType);

  if (isDebt) {
    return `Performing: DSCR ≥ ${STATUS_THRESHOLDS.DEBT.PERFORMING_MIN_DSCR}x | Watchlist: ${STATUS_THRESHOLDS.DEBT.WATCHLIST_MIN_DSCR}x-${STATUS_THRESHOLDS.DEBT.PERFORMING_MIN_DSCR}x | Remediation: < ${STATUS_THRESHOLDS.DEBT.WATCHLIST_MIN_DSCR}x`;
  }

  if (isEquity) {
    return `Performing: ≥ ${STATUS_THRESHOLDS.EQUITY.PERFORMING_MIN_RUNWAY}mo | Watchlist: ${STATUS_THRESHOLDS.EQUITY.WATCHLIST_MIN_RUNWAY}-${STATUS_THRESHOLDS.EQUITY.PERFORMING_MIN_RUNWAY}mo | Remediation: < ${STATUS_THRESHOLDS.EQUITY.WATCHLIST_MIN_RUNWAY}mo`;
  }

  return 'Mixed instruments - status based on individual metrics';
}
