import { supabase } from './supabase';

export async function recalculateDSCR(projectId: string, newInterestRate: number): Promise<void> {
  try {
    const { data: project } = await supabase
      .from('projects')
      .select('instrument_type')
      .eq('id', projectId)
      .maybeSingle();

    if (!project || !project.instrument_type.toLowerCase().includes('debt')) {
      return;
    }

    const { data: latestSnapshot } = await supabase
      .from('financial_snapshots')
      .select('ebitda, capex, debt_outstanding')
      .eq('project_id', projectId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestSnapshot || !latestSnapshot.debt_outstanding) {
      return;
    }

    const annualInterestExpense = (newInterestRate / 100) * latestSnapshot.debt_outstanding;

    if (annualInterestExpense === 0) {
      return;
    }

    const netOperatingIncome = latestSnapshot.ebitda - latestSnapshot.capex;
    const newDSCR = netOperatingIncome / annualInterestExpense;

    const dscrTrend = newDSCR > 1.3 ? 'improving' : newDSCR < 1.0 ? 'declining' : 'stable';

    await supabase
      .from('watchlist_metrics')
      .update({
        dscr_current: newDSCR,
        dscr_trend: dscrTrend,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId);

  } catch (error) {
    console.error('Error recalculating DSCR:', error);
  }
}
