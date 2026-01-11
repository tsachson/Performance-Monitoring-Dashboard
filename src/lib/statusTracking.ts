import { supabase } from './supabase';
import { Project, WatchlistMetrics } from '../types/database';
import {
  calculateProjectStatus,
  ProjectStatus,
  isDebtInstrument,
  isEquityInstrument,
  STATUS_THRESHOLDS
} from './projectStatus';

interface StatusChangeDetails {
  previousStatus: ProjectStatus;
  newStatus: ProjectStatus;
  trigger: string;
  metricDetails: string;
}

export async function trackStatusChange(
  projectId: string,
  project: Project,
  metrics: WatchlistMetrics | null
): Promise<boolean> {
  try {
    const calculatedStatus = calculateProjectStatus(project, metrics);

    const { data: lastHistory } = await supabase
      .from('project_status_history')
      .select('status')
      .eq('project_id', projectId)
      .order('status_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastRecordedStatus = lastHistory?.status || project.current_status;

    if (calculatedStatus !== lastRecordedStatus) {
      const details = generateStatusChangeDetails(
        lastRecordedStatus as ProjectStatus,
        calculatedStatus,
        project,
        metrics
      );

      await supabase
        .from('project_status_history')
        .insert({
          project_id: projectId,
          status: calculatedStatus,
          sub_status: details.trigger,
          status_date: new Date().toISOString().split('T')[0],
          changed_by: 'System (Auto-detected)',
          notes: details.metricDetails
        });

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error tracking status change:', error);
    return false;
  }
}

function generateStatusChangeDetails(
  previousStatus: ProjectStatus,
  newStatus: ProjectStatus,
  project: Project,
  metrics: WatchlistMetrics | null
): StatusChangeDetails {
  const isDebt = isDebtInstrument(project.instrument_type);
  const isEquity = isEquityInstrument(project.instrument_type);

  let trigger = '';
  let metricDetails = '';

  if (newStatus === 'performing') {
    trigger = 'Metrics improved to performing level';

    if (isDebt && metrics?.dscr_current) {
      const dscr = Number(metrics.dscr_current);
      metricDetails = `DSCR recovered to ${dscr.toFixed(2)}x (threshold: ${STATUS_THRESHOLDS.DEBT.PERFORMING_MIN_DSCR}x). Project moved from ${previousStatus} to performing status.`;
    } else if (isEquity && metrics?.cash_runway_months) {
      const runway = Number(metrics.cash_runway_months);
      metricDetails = `Cash runway extended to ${runway.toFixed(1)} months (threshold: ${STATUS_THRESHOLDS.EQUITY.PERFORMING_MIN_RUNWAY}mo). Project moved from ${previousStatus} to performing status.`;
    }
  } else if (newStatus === 'watch-list') {
    if (previousStatus === 'performing') {
      trigger = 'Metrics deteriorated - Watchlist monitoring required';

      if (isDebt && metrics?.dscr_current) {
        const dscr = Number(metrics.dscr_current);
        metricDetails = `DSCR declined to ${dscr.toFixed(2)}x (below ${STATUS_THRESHOLDS.DEBT.PERFORMING_MIN_DSCR}x but above ${STATUS_THRESHOLDS.DEBT.WATCHLIST_MIN_DSCR}x). Enhanced monitoring initiated.`;
      } else if (isEquity && metrics?.cash_runway_months) {
        const runway = Number(metrics.cash_runway_months);
        metricDetails = `Cash runway decreased to ${runway.toFixed(1)} months (below ${STATUS_THRESHOLDS.EQUITY.PERFORMING_MIN_RUNWAY}mo but above ${STATUS_THRESHOLDS.EQUITY.WATCHLIST_MIN_RUNWAY}mo). Enhanced monitoring initiated.`;
      }
    } else if (previousStatus === 'remediation-required') {
      trigger = 'Metrics improved from remediation';

      if (isDebt && metrics?.dscr_current) {
        const dscr = Number(metrics.dscr_current);
        metricDetails = `DSCR improved to ${dscr.toFixed(2)}x (above ${STATUS_THRESHOLDS.DEBT.WATCHLIST_MIN_DSCR}x). Project moved from remediation to watchlist status.`;
      } else if (isEquity && metrics?.cash_runway_months) {
        const runway = Number(metrics.cash_runway_months);
        metricDetails = `Cash runway improved to ${runway.toFixed(1)} months (above ${STATUS_THRESHOLDS.EQUITY.WATCHLIST_MIN_RUNWAY}mo). Project moved from remediation to watchlist status.`;
      }
    }
  } else if (newStatus === 'remediation-required') {
    trigger = 'Critical metrics - Immediate remediation required';

    if (isDebt && metrics?.dscr_current) {
      const dscr = Number(metrics.dscr_current);
      metricDetails = `DSCR fell to ${dscr.toFixed(2)}x (below ${STATUS_THRESHOLDS.DEBT.WATCHLIST_MIN_DSCR}x critical threshold). Immediate remediation action required. Previous status: ${previousStatus}.`;
    } else if (isEquity && metrics?.cash_runway_months) {
      const runway = Number(metrics.cash_runway_months);
      metricDetails = `Cash runway dropped to ${runway.toFixed(1)} months (below ${STATUS_THRESHOLDS.EQUITY.WATCHLIST_MIN_RUNWAY}mo critical threshold). Immediate remediation action required. Previous status: ${previousStatus}.`;
    }
  }

  if (!metricDetails) {
    metricDetails = `Status changed from ${previousStatus} to ${newStatus}.`;
  }

  return {
    previousStatus,
    newStatus,
    trigger,
    metricDetails
  };
}

export async function checkAndTrackAllProjectStatuses(): Promise<number> {
  try {
    const { data: projects } = await supabase
      .from('projects')
      .select('*, issuer:issuers(*)')
      .neq('current_status', 'closed');

    if (!projects) return 0;

    let changesDetected = 0;

    for (const project of projects) {
      const { data: metrics } = await supabase
        .from('watchlist_metrics')
        .select('*')
        .eq('project_id', project.id)
        .maybeSingle();

      const statusChanged = await trackStatusChange(project.id, project, metrics);
      if (statusChanged) {
        changesDetected++;
      }
    }

    return changesDetected;
  } catch (error) {
    console.error('Error checking project statuses:', error);
    return 0;
  }
}
