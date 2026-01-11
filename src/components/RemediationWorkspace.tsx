import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ProjectWithIssuer, WatchlistMetrics, SupportNetworkContact } from '../types/database';
import { calculateProjectStatus, STATUS_THRESHOLDS } from '../lib/projectStatus';
import { AlertTriangle, AlertCircle, Users, FileText, Printer, ExternalLink, ArrowUpDown, Info, Save } from 'lucide-react';

interface RemediationProject extends ProjectWithIssuer {
  metrics?: WatchlistMetrics | null;
  contacts?: SupportNetworkContact[];
}

interface RemediationWorkspaceProps {
  onSelectProject: (projectId: string) => void;
}

type SortOption = 'name' | 'risk' | 'metric';
type SortDirection = 'asc' | 'desc';
type WorkoutStage = 'assessment' | 'monitoring' | 'negotiation' | 'critical';

export function RemediationWorkspace({ onSelectProject }: RemediationWorkspaceProps) {
  const [projects, setProjects] = useState<RemediationProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'debt' | 'equity'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('risk');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [stageFilter, setStageFilter] = useState<'all' | WorkoutStage>('all');
  const [checklistStates, setChecklistStates] = useState<Record<string, Record<number, boolean>>>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadRemediationProjects();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      loadSavedChecklists();
    }
  }, [projects]);

  async function loadRemediationProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          issuer:issuers(*),
          metrics:watchlist_metrics(*),
          contacts:support_network_contacts(*)
        `)
        .neq('current_status', 'closed')
        .order('project_name');

      if (error) throw error;

      const allProjects: RemediationProject[] = (data as any[]).map(p => {
        const rawMetrics = Array.isArray(p.metrics)
          ? (p.metrics.length > 0 ? p.metrics[0] : null)
          : p.metrics;

        const metrics = rawMetrics ? {
          ...rawMetrics,
          risk_score: Number(rawMetrics.risk_score),
          dscr_current: rawMetrics.dscr_current !== null ? Number(rawMetrics.dscr_current) : null,
          dscr_covenant: rawMetrics.dscr_covenant !== null ? Number(rawMetrics.dscr_covenant) : null,
          liquidity_days: rawMetrics.liquidity_days !== null ? Number(rawMetrics.liquidity_days) : null,
          covenant_headroom_pct: rawMetrics.covenant_headroom_pct !== null ? Number(rawMetrics.covenant_headroom_pct) : null,
          cash_runway_months: rawMetrics.cash_runway_months !== null ? Number(rawMetrics.cash_runway_months) : null,
          revenue_vs_plan_pct: rawMetrics.revenue_vs_plan_pct !== null ? Number(rawMetrics.revenue_vs_plan_pct) : null
        } : null;

        return {
          ...p,
          metrics,
          contacts: Array.isArray(p.contacts) ? p.contacts : (p.contacts ? [p.contacts] : [])
        };
      });

      const remediationProjects = allProjects.filter(p => {
        const status = calculateProjectStatus(p, p.metrics);
        return status === 'remediation-required';
      });

      setProjects(remediationProjects);
    } catch (error) {
      console.error('Error loading remediation projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSavedChecklists() {
    try {
      const projectIds = projects.map(p => p.id);
      const { data, error } = await supabase
        .from('workout_punchlist_saves')
        .select('*')
        .in('project_id', projectIds)
        .order('saved_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const latestSaves: Record<string, any> = {};
        data.forEach(save => {
          if (!latestSaves[save.project_id]) {
            latestSaves[save.project_id] = save;
          }
        });

        const newChecklistStates: Record<string, Record<number, boolean>> = {};
        Object.entries(latestSaves).forEach(([projectId, save]) => {
          const items = save.checklist_items as Array<{ task: string; checked: boolean }>;
          const checkboxStates: Record<number, boolean> = {};
          items.forEach((item, index) => {
            checkboxStates[index] = item.checked;
          });
          newChecklistStates[projectId] = checkboxStates;
        });

        setChecklistStates(newChecklistStates);
      }
    } catch (error) {
      console.error('Error loading saved checklists:', error);
    }
  }

  function handleCheckboxChange(projectId: string, itemIndex: number) {
    setChecklistStates(prev => ({
      ...prev,
      [projectId]: {
        ...(prev[projectId] || {}),
        [itemIndex]: !(prev[projectId]?.[itemIndex] || false)
      }
    }));
  }

  async function handleSavePunchlist(project: RemediationProject) {
    try {
      setSavingStates(prev => ({ ...prev, [project.id]: true }));

      const checklist = getRemediationChecklist(project);
      const checklistItems = checklist.items.map((item, index) => ({
        task: item.task,
        checked: checklistStates[project.id]?.[index] || false
      }));

      const { error } = await supabase
        .from('workout_punchlist_saves')
        .insert({
          project_id: project.id,
          checklist_items: checklistItems,
          saved_by: 'user',
          saved_at: new Date().toISOString()
        });

      if (error) throw error;

    } catch (error) {
      console.error('Error saving punchlist:', error);
      alert('Failed to save punchlist. Please try again.');
    } finally {
      setSavingStates(prev => ({ ...prev, [project.id]: false }));
    }
  }

  function getWorkoutStage(project: RemediationProject): WorkoutStage {
    if (!project.metrics) {
      return 'assessment';
    }

    const riskScore = project.metrics.risk_score;
    if (typeof riskScore !== 'number' || isNaN(riskScore)) {
      return 'assessment';
    }

    return riskScore >= 80 ? 'critical' :
           riskScore >= 60 ? 'negotiation' :
           riskScore >= 40 ? 'monitoring' : 'assessment';
  }

  function isDebtInstrument(instrumentType: string): boolean {
    return instrumentType.includes('Debt') || instrumentType.includes('Bonds');
  }

  function isEquityInstrument(instrumentType: string): boolean {
    return instrumentType.includes('Equity');
  }

  function getStageCounts() {
    const counts = {
      assessment: 0,
      monitoring: 0,
      negotiation: 0,
      critical: 0
    };

    projects.forEach(project => {
      const stage = getWorkoutStage(project);
      counts[stage]++;
    });

    return counts;
  }

  function handleSort(field: SortOption) {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  }

  function getSortedAndFilteredProjects(): RemediationProject[] {
    let filtered = [...projects];

    if (filter === 'debt') {
      filtered = filtered.filter(p => isDebtInstrument(p.instrument_type));
    } else if (filter === 'equity') {
      filtered = filtered.filter(p => isEquityInstrument(p.instrument_type));
    }

    if (stageFilter !== 'all') {
      filtered = filtered.filter(p => getWorkoutStage(p) === stageFilter);
    }

    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'name') {
        comparison = a.project_name.localeCompare(b.project_name);
      } else if (sortBy === 'risk') {
        const riskA = a.metrics?.risk_score ?? -1;
        const riskB = b.metrics?.risk_score ?? -1;
        comparison = riskA - riskB;
      } else if (sortBy === 'metric') {
        const isDebtA = isDebtInstrument(a.instrument_type);
        const isDebtB = isDebtInstrument(b.instrument_type);

        if (isDebtA && isDebtB) {
          const dscrA = a.metrics?.dscr_current ?? 999;
          const dscrB = b.metrics?.dscr_current ?? 999;
          comparison = dscrA - dscrB;
        } else if (!isDebtA && !isDebtB) {
          const runwayA = a.metrics?.cash_runway_months ?? -1;
          const runwayB = b.metrics?.cash_runway_months ?? -1;
          comparison = runwayA - runwayB;
        } else {
          comparison = a.project_name.localeCompare(b.project_name);
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }

  function getRemediationChecklist(project: RemediationProject) {
    const isDebt = isDebtInstrument(project.instrument_type);
    const dealSize = Number(project.deal_size);
    const isLargeDeal = dealSize > 50000000;
    const sector = project.issuer?.industry_sector || '';
    const revenueVsPlan = project.metrics?.revenue_vs_plan_pct || 0;
    const isRevenueDeclining = revenueVsPlan < -5;
    const riskScore = project.metrics?.risk_score || 0;
    const isCritical = riskScore >= 80;
    const instrumentType = project.instrument_type.toLowerCase();

    const items: Array<{ task: string }> = [];

    if (isDebt) {
      items.push({ task: 'Root cause analysis: Liquidity, revenue, cost structure' });

      if (instrumentType.includes('secured')) {
        items.push({ task: 'Collateral review: Current value & realization scenarios' });
        items.push({ task: 'Security perfection audit: Documentation, liens, enforceability' });
      } else if (instrumentType.includes('senior')) {
        items.push({ task: 'Collateral review: Current value & realization scenarios' });
      } else if (instrumentType.includes('subordinated')) {
        items.push({ task: 'Intercreditor agreement review: Subordination terms & payment blocks' });
      }

      items.push({ task: 'Financial projections: Baseline, stress, recovery' });
      items.push({ task: 'Map creditor group: Positions, priorities, voting power' });

      if (instrumentType.includes('bonds') && isLargeDeal) {
        items.push({ task: 'Bondholder committee formation: Identify lead investors' });
        items.push({ task: 'Indenture review: Covenants, events of default, amendment thresholds' });
      }

      if (isCritical) {
        items.push({ task: 'Legal counsel engagement: Restructuring & insolvency expertise' });
        items.push({ task: 'Asset preservation: Identify & secure critical assets' });
      }

      items.push({ task: 'Develop restructuring options: Term extension, rate reduction, etc.' });
      items.push({ task: 'Implement 13-week rolling cash flow forecast' });

      if (isRevenueDeclining) {
        items.push({ task: 'Revenue stabilization plan: Market analysis, pricing, sales strategy' });
      }

      if (isLargeDeal) {
        items.push({ task: 'Restructuring advisor engagement: Investment bank or advisory firm' });
      }

    } else {
      items.push({ task: 'Root cause analysis: Solvency, strategy, market fit' });
      items.push({ task: 'Enterprise valuation: DCF, comps, asset-based' });

      if (instrumentType.includes('preferred')) {
        items.push({ task: 'Preference stack analysis: Liquidation multiples, participation rights' });
        items.push({ task: 'Conversion option review: Terms, triggers, dilution impact' });
      }

      if (project.has_warrants) {
        items.push({ task: 'Warrant exercise analysis: Strike price, dilution, value accretion' });
      }

      items.push({ task: 'Management capability: Retain, supplement, or replace' });

      if (isCritical) {
        items.push({ task: 'Board restructuring: Add turnaround/industry expertise' });
        items.push({ task: 'Interim management consideration: CFO, COO, or CRO' });
      }

      items.push({ task: 'Map shareholder group: Ownership, influence, alignment' });

      if (isLargeDeal) {
        items.push({ task: 'Shareholder agreement: Voting, drag-along, tag-along provisions' });
      }

      if (isRevenueDeclining && sector.toLowerCase().includes('technology')) {
        items.push({ task: 'Product-market fit assessment: Customer retention, unit economics' });
        items.push({ task: 'Pivot evaluation: Adjacent markets, alternative business models' });
      } else if (isRevenueDeclining) {
        items.push({ task: 'Market position analysis: Competitive dynamics, pricing pressure' });
      }

      items.push({ task: 'Develop turnaround options: Bridge capital, strategic pivot, sale' });

      if (sector.toLowerCase().includes('infrastructure') || sector.toLowerCase().includes('energy')) {
        items.push({ task: 'Asset disposal review: Non-core asset monetization' });
        items.push({ task: 'Operational efficiency: Capex optimization, O&M cost reduction' });
      }

      items.push({ task: 'Weekly revenue & burn monitoring' });

      if (project.metrics && project.metrics.cash_runway_months && project.metrics.cash_runway_months < 6) {
        items.push({ task: 'Emergency funding plan: Bridge financing, asset sales, cost cuts' });
      }
    }

    if (['India', 'Indonesia', 'Philippines', 'Vietnam', 'Bangladesh'].includes(project.country)) {
      items.push({ task: 'Local regulatory review: FDI rules, repatriation constraints' });
    }

    if (isLargeDeal && isCritical) {
      items.push({ task: 'Stakeholder communication plan: Transparency, alignment, trust-building' });
    }

    return {
      title: 'Remediation Workout Process',
      items
    };
  }

  function handlePrintWorkoutReport() {
    const formatCurrencyForPrint = (value: number, currency: string) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    };

    const criticalCount = filteredProjects.filter(p => getWorkoutStage(p) === 'critical').length;
    const negotiationCount = filteredProjects.filter(p => getWorkoutStage(p) === 'negotiation').length;
    const monitoringCount = filteredProjects.filter(p => getWorkoutStage(p) === 'monitoring').length;
    const assessmentCount = filteredProjects.filter(p => getWorkoutStage(p) === 'assessment').length;

    let content = `REMEDIATION MANAGEMENT REPORT\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
    content += `=== SUMMARY ===\n`;
    content += `Total Active Workouts: ${filteredProjects.length}\n`;
    content += `Critical Action: ${criticalCount}\n`;
    content += `Negotiation: ${negotiationCount}\n`;
    content += `Active Monitoring: ${monitoringCount}\n`;
    content += `Assessment: ${assessmentCount}\n\n`;
    content += `=== PROJECT DETAILS ===\n\n`;

    filteredProjects.forEach(project => {
      const stage = getWorkoutStage(project);
      const checklist = getRemediationChecklist(project);
      const status = calculateProjectStatus(project, project.metrics);

      content += `Project: ${project.project_name}\n`;
      content += `ID: ${project.unique_project_id}\n`;
      content += `Issuer: ${project.issuer.name}\n`;
      content += `Sector: ${project.issuer.industry_sector}\n`;
      content += `Country: ${project.country}\n`;
      content += `Status: ${status}\n`;
      content += `Instrument: ${project.instrument_type}\n`;
      content += `Deal Size: ${formatCurrencyForPrint(project.deal_size, project.issuance_currency)}\n`;
      content += `Workout Stage: ${stage.toUpperCase()}\n`;

      if (project.metrics) {
        content += `Risk Score: ${project.metrics.risk_score}/100\n`;
        if (project.metrics.dscr_current !== null) {
          content += `DSCR: ${project.metrics.dscr_current.toFixed(2)}x (Covenant: ${project.metrics.dscr_covenant}x)\n`;
        }
        if (project.metrics.liquidity_days !== null) {
          content += `Liquidity: ${project.metrics.liquidity_days} days\n`;
        }
        if (project.metrics.cash_runway_months !== null) {
          content += `Cash Runway: ${project.metrics.cash_runway_months} months\n`;
        }
        if (project.metrics.revenue_vs_plan_pct !== null) {
          content += `Revenue vs Plan: ${project.metrics.revenue_vs_plan_pct.toFixed(1)}%\n`;
        }
        content += `Reporting Quality: ${project.metrics.reporting_quality || 'unknown'}\n`;
        content += `Sponsor Support: ${project.metrics.sponsor_support_status || 'unknown'}\n`;
      }

      content += `\n${checklist.title}:\n`;
      checklist.items.forEach((item, index) => {
        content += `  ${index + 1}. [ ] ${item.task}\n`;
      });

      content += `\n${'-'.repeat(80)}\n\n`;
    });

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Remediation Management Report</title>');
      printWindow.document.write('<style>body { font-family: monospace; white-space: pre; padding: 20px; }</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(content);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  }

  function formatCurrency(value: number, currency: string) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredProjects = getSortedAndFilteredProjects();
  const stageCounts = getStageCounts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Remediation Management</h1>
          <p className="mt-1 text-sm text-gray-600">Workout strategy and execution for distressed investments</p>
        </div>
        <button
          onClick={handlePrintWorkoutReport}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-5 h-5" />
          <span>Print Report</span>
        </button>
      </div>

      <div className="space-y-6">
        <button
          onClick={() => setStageFilter('all')}
          className={`w-full bg-white rounded-lg shadow p-6 border-2 transition-all text-left ${
            stageFilter === 'all' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Active Workouts</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{projects.length}</p>
              <p className="text-xs text-gray-600 mt-2">Remediation-required projects in active restructuring</p>
            </div>
            <div className="bg-red-100 p-4 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-start gap-2 text-xs text-red-700">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold mb-1">Remediation Thresholds:</div>
                <div>Debt: DSCR &lt; {STATUS_THRESHOLDS.DEBT.WATCHLIST_MIN_DSCR}x</div>
                <div>Equity: Cash Runway &lt; {STATUS_THRESHOLDS.EQUITY.WATCHLIST_MIN_RUNWAY} months</div>
              </div>
            </div>
          </div>
        </button>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Workout Stages</h3>
            <p className="text-xs text-gray-600 mt-1">Click to filter by stage</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => setStageFilter(stageFilter === 'assessment' ? 'all' : 'assessment')}
              className={`bg-blue-50 rounded-lg p-3 border-2 transition-all text-left hover:shadow-md ${
                stageFilter === 'assessment' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200 hover:border-blue-400'
              }`}
            >
              <p className="text-xs font-medium text-blue-900">Assessment</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stageCounts.assessment}</p>
              <p className="text-xs text-blue-700 mt-1">Risk &lt; 40</p>
            </button>
            <button
              onClick={() => setStageFilter(stageFilter === 'monitoring' ? 'all' : 'monitoring')}
              className={`bg-yellow-50 rounded-lg p-3 border-2 transition-all text-left hover:shadow-md ${
                stageFilter === 'monitoring' ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-yellow-200 hover:border-yellow-400'
              }`}
            >
              <p className="text-xs font-medium text-yellow-900">Active Monitoring</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stageCounts.monitoring}</p>
              <p className="text-xs text-yellow-700 mt-1">Risk 40-59</p>
            </button>
            <button
              onClick={() => setStageFilter(stageFilter === 'negotiation' ? 'all' : 'negotiation')}
              className={`bg-orange-50 rounded-lg p-3 border-2 transition-all text-left hover:shadow-md ${
                stageFilter === 'negotiation' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-orange-200 hover:border-orange-400'
              }`}
            >
              <p className="text-xs font-medium text-orange-900">Negotiation</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stageCounts.negotiation}</p>
              <p className="text-xs text-orange-700 mt-1">Risk 60-79</p>
            </button>
            <button
              onClick={() => setStageFilter(stageFilter === 'critical' ? 'all' : 'critical')}
              className={`bg-red-50 rounded-lg p-3 border-2 transition-all text-left hover:shadow-md ${
                stageFilter === 'critical' ? 'border-red-500 ring-2 ring-red-200' : 'border-red-200 hover:border-red-400'
              }`}
            >
              <p className="text-xs font-medium text-red-900">Critical Action</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stageCounts.critical}</p>
              <p className="text-xs text-red-700 mt-1">Risk ≥ 80</p>
            </button>
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start gap-2 text-xs text-slate-700">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-600" />
              <div>
                <span className="font-semibold">Risk Score Assignment:</span> Risk levels are manually assigned by the remediation team staff when a project falls off the Watchlist and enters Remediation Management. These scores determine the urgency and workout stage for each project.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Remediation Dashboard</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort:</span>
              <button
                onClick={() => handleSort('metric')}
                className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  sortBy === 'metric'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter === 'debt' ? 'DSCR' : filter === 'equity' ? 'Cash Runway' : 'Key Metric'}
                <ArrowUpDown className={`w-3 h-3 ${sortBy === 'metric' ? 'opacity-100' : 'opacity-0'}`} />
              </button>
              <button
                onClick={() => handleSort('risk')}
                className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  sortBy === 'risk'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Risk Score
                <ArrowUpDown className={`w-3 h-3 ${sortBy === 'risk' ? 'opacity-100' : 'opacity-0'}`} />
              </button>
              <button
                onClick={() => handleSort('name')}
                className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  sortBy === 'name'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Name
                <ArrowUpDown className={`w-3 h-3 ${sortBy === 'name' ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            </div>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Instruments
              </button>
              <button
                onClick={() => setFilter('debt')}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  filter === 'debt'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Debt Only
              </button>
              <button
                onClick={() => setFilter('equity')}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  filter === 'equity'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Equity Only
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredProjects.map((project) => {
          const stage = getWorkoutStage(project);
          const isDebt = isDebtInstrument(project.instrument_type);
          const stageConfig = {
            critical: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-800', label: 'Critical Action', icon: AlertTriangle, iconColor: 'text-red-600' },
            negotiation: { bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-800', label: 'Negotiation', icon: AlertTriangle, iconColor: 'text-orange-600' },
            monitoring: { bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-800', label: 'Active Monitoring', icon: AlertCircle, iconColor: 'text-yellow-600' },
            assessment: { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-800', label: 'Assessment', icon: AlertCircle, iconColor: 'text-blue-600' }
          };
          const config = stageConfig[stage];
          const StageIcon = config.icon;
          const checklist = getRemediationChecklist(project);

          return (
            <div
              key={project.id}
              className={`bg-white rounded-lg shadow border-2 p-6 ${config.bg}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <StageIcon className={`w-5 h-5 ${config.iconColor}`} />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{project.project_name}</h3>
                    <p className="text-sm text-gray-600">{project.unique_project_id} • {project.issuer?.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${config.badge}`}>
                    {config.label}
                  </span>
                  <button
                    onClick={() => onSelectProject(project.id)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center"
                  >
                    View Details
                    <ExternalLink className="ml-1 w-4 h-4" />
                  </button>
                </div>
              </div>

              {project.metrics && (
                <div>
                  {isDebt ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">DSCR Current</p>
                        <p className={`text-lg font-bold ${
                          project.metrics.dscr_current && project.metrics.dscr_current < 1.2
                            ? 'text-red-600'
                            : 'text-gray-900'
                        }`}>
                          {project.metrics.dscr_current?.toFixed(2) || 'N/A'}x
                        </p>
                        <p className="text-xs text-gray-500">Covenant: {project.metrics.dscr_covenant}x</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Liquidity</p>
                        <p className={`text-lg font-bold ${
                          project.metrics.liquidity_days && project.metrics.liquidity_days < 90
                            ? 'text-yellow-600'
                            : 'text-gray-900'
                        }`}>
                          {project.metrics.liquidity_days || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">days coverage</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Covenant Headroom</p>
                        <p className={`text-lg font-bold ${
                          project.metrics.covenant_headroom_pct !== null && project.metrics.covenant_headroom_pct < 10
                            ? 'text-red-600'
                            : 'text-gray-900'
                        }`}>
                          {project.metrics.covenant_headroom_pct?.toFixed(1) || 'N/A'}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Reporting</p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          project.metrics.reporting_quality === 'on-time'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {project.metrics.reporting_quality || 'unknown'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Sponsor Support</p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          project.metrics.sponsor_support_status === 'committed'
                            ? 'bg-green-100 text-green-800'
                            : project.metrics.sponsor_support_status === 'uncertain'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {project.metrics.sponsor_support_status || 'unknown'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Cash Runway</p>
                        <p className={`text-lg font-bold ${
                          project.metrics.cash_runway_months && project.metrics.cash_runway_months < 9
                            ? 'text-red-600'
                            : 'text-gray-900'
                        }`}>
                          {project.metrics.cash_runway_months || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">months</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Revenue vs Plan</p>
                        <p className={`text-lg font-bold ${
                          project.metrics.revenue_vs_plan_pct && project.metrics.revenue_vs_plan_pct < 70
                            ? 'text-red-600'
                            : 'text-gray-900'
                        }`}>
                          {project.metrics.revenue_vs_plan_pct?.toFixed(0) || 'N/A'}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">DSCR Trend</p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          project.metrics.dscr_trend === 'improving'
                            ? 'bg-green-100 text-green-800'
                            : project.metrics.dscr_trend === 'declining'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.metrics.dscr_trend || 'stable'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Reporting</p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          project.metrics.reporting_quality === 'on-time'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {project.metrics.reporting_quality || 'unknown'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Sponsor Support</p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          project.metrics.sponsor_support_status === 'committed'
                            ? 'bg-green-100 text-green-800'
                            : project.metrics.sponsor_support_status === 'uncertain'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {project.metrics.sponsor_support_status || 'unknown'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Risk Score:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              Number(project.metrics.risk_score) >= 80
                                ? 'bg-red-500'
                                : Number(project.metrics.risk_score) >= 60
                                ? 'bg-orange-500'
                                : Number(project.metrics.risk_score) >= 40
                                ? 'bg-yellow-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${project.metrics.risk_score}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-bold ${
                          Number(project.metrics.risk_score) >= 80
                            ? 'text-red-600'
                            : Number(project.metrics.risk_score) >= 60
                            ? 'text-orange-600'
                            : Number(project.metrics.risk_score) >= 40
                            ? 'text-yellow-600'
                            : 'text-blue-600'
                        }`}>
                          {project.metrics.risk_score}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-gray-900">{checklist.title}</h4>
                  </div>
                  <button
                    onClick={() => handleSavePunchlist(project)}
                    disabled={savingStates[project.id]}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingStates[project.id] ? 'Saving...' : 'Save Punchlist'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {checklist.items.map((item, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        checked={checklistStates[project.id]?.[index] || false}
                        onChange={() => handleCheckboxChange(project.id, index)}
                        className="mt-0.5 h-3.5 w-3.5 text-blue-600 rounded cursor-pointer"
                      />
                      <span className="text-xs text-gray-700">{item.task}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {projects.length === 0
              ? 'No remediation projects found'
              : 'No projects match the selected filters'}
          </p>
        </div>
      )}
    </div>
  );
}
