import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ProjectWithIssuer, WatchlistMetrics } from '../types/database';
import { calculateProjectStatus, STATUS_THRESHOLDS, isDebtInstrument, isEquityInstrument } from '../lib/projectStatus';
import { AlertTriangle, CheckCircle, AlertCircle, TrendingDown, ExternalLink, Printer, ArrowUpDown, Info, Binoculars } from 'lucide-react';

interface WatchlistProject extends ProjectWithIssuer {
  metrics?: WatchlistMetrics;
}

interface WatchlistMonitoringProps {
  onSelectProject: (projectId: string) => void;
}

type HealthStatus = 'healthy' | 'caution' | 'critical' | 'unknown';
type SortOption = 'name' | 'metric';
type SortDirection = 'asc' | 'desc';

export function WatchlistMonitoring({ onSelectProject }: WatchlistMonitoringProps) {
  const [projects, setProjects] = useState<WatchlistProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'debt' | 'equity'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('metric');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [healthFilter, setHealthFilter] = useState<'all' | HealthStatus>('all');

  useEffect(() => {
    console.log('WatchlistMonitoring component mounted');
    loadWatchlistProjects();
  }, []);

  async function loadWatchlistProjects() {
    try {
      console.log('Starting to load watchlist projects...');
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*, issuer:issuers(*)')
        .neq('current_status', 'closed')
        .order('project_name');

      console.log('Projects query result:', { data: projectsData, error: projectsError });

      if (projectsError) throw projectsError;

      const { data: metricsData, error: metricsError } = await supabase
        .from('watchlist_metrics')
        .select('*');

      console.log('Metrics query result:', { count: metricsData?.length, error: metricsError });

      if (metricsError) throw metricsError;

      const metricsMap = new Map<string, WatchlistMetrics>();
      (metricsData || []).forEach(m => {
        metricsMap.set(m.project_id, m);
      });

      const allProjectsWithMetrics = (projectsData as any[]).map(p => ({
        ...p,
        issuer: Array.isArray(p.issuer) ? p.issuer[0] : p.issuer,
        metrics: metricsMap.get(p.id) || null
      }));

      const watchlistProjects = allProjectsWithMetrics.filter(p => {
        const status = calculateProjectStatus(p, p.metrics);
        return status === 'watch-list';
      });

      console.log('Loaded total projects:', allProjectsWithMetrics.length);
      console.log('Watchlist projects:', watchlistProjects.length);
      console.log('Projects with metrics:', watchlistProjects.filter(p => p.metrics).length);
      if (watchlistProjects.length > 0) {
        console.log('Sample project:', watchlistProjects[0]);
        console.log('Sample metrics:', watchlistProjects[0]?.metrics);
        console.log('Sample risk_score type:', typeof watchlistProjects[0]?.metrics?.risk_score);
      }

      setProjects(watchlistProjects);
    } catch (error) {
      console.error('Error loading watchlist:', error);
    } finally {
      setLoading(false);
    }
  }

  const getHealthStatus = (project: WatchlistProject): HealthStatus => {
    if (!project.metrics) {
      return 'unknown';
    }

    let negativeAspects = 0;

    if (project.metrics.revenue_vs_plan_pct !== null && project.metrics.revenue_vs_plan_pct < 100) {
      negativeAspects++;
    }

    if (project.metrics.reporting_quality === 'delayed') {
      negativeAspects++;
    }

    if (project.metrics.sponsor_support_status === 'uncertain' || project.metrics.sponsor_support_status === 'withdrawn') {
      negativeAspects++;
    }

    if (negativeAspects >= 2) {
      return 'critical';
    } else if (negativeAspects === 1) {
      return 'caution';
    } else {
      return 'healthy';
    }
  };

  const handleSort = (field: SortOption) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const getSortedAndFilteredProjects = () => {
    let filtered = [...projects];

    if (filter === 'debt') {
      filtered = filtered.filter(p => isDebtInstrument(p.instrument_type));
    } else if (filter === 'equity') {
      filtered = filtered.filter(p => isEquityInstrument(p.instrument_type));
    }

    if (healthFilter !== 'all') {
      filtered = filtered.filter(p => getHealthStatus(p) === healthFilter);
    }

    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'name') {
        comparison = a.project_name.localeCompare(b.project_name);
      } else if (sortBy === 'metric') {
        const isDebtA = isDebtInstrument(a.instrument_type);
        const isDebtB = isDebtInstrument(b.instrument_type);

        if (isDebtA && isDebtB) {
          const dscrA = Number(a.metrics?.dscr_current) || 999;
          const dscrB = Number(b.metrics?.dscr_current) || 999;
          comparison = dscrA - dscrB;
        } else if (!isDebtA && !isDebtB) {
          const runwayA = Number(a.metrics?.cash_runway_months) || 0;
          const runwayB = Number(b.metrics?.cash_runway_months) || 0;
          comparison = runwayA - runwayB;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const filteredProjects = getSortedAndFilteredProjects();

  const allProjects = [...projects];
  const totalHealthyCount = allProjects.filter(p => getHealthStatus(p) === 'healthy').length;
  const totalCautionCount = allProjects.filter(p => getHealthStatus(p) === 'caution').length;
  const totalCriticalCount = allProjects.filter(p => getHealthStatus(p) === 'critical').length;

  const handlePrint = () => {
    const healthyCount = filteredProjects.filter(p => getHealthStatus(p) === 'healthy').length;
    const cautionCount = filteredProjects.filter(p => getHealthStatus(p) === 'caution').length;
    const criticalCount = filteredProjects.filter(p => getHealthStatus(p) === 'critical').length;

    let content = `WATCHLIST MONITORING REPORT\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
    content += `=== SUMMARY ===\n`;
    content += `Total Projects Monitored: ${filteredProjects.length}\n`;
    content += `Healthy: ${healthyCount}\n`;
    content += `Caution: ${cautionCount}\n`;
    content += `Critical: ${criticalCount}\n\n`;
    content += `=== PROJECT DETAILS ===\n\n`;

    filteredProjects.forEach(project => {
      const health = getHealthStatus(project);
      const status = calculateProjectStatus(project, project.metrics);
      content += `Project: ${project.project_name}\n`;
      content += `ID: ${project.unique_project_id}\n`;
      content += `Issuer: ${project.issuer?.name}\n`;
      content += `Status: ${status}\n`;
      content += `Health: ${health.toUpperCase()}\n`;

      if (project.metrics) {
        if (project.metrics.dscr_current !== null) {
          content += `DSCR: ${project.metrics.dscr_current.toFixed(2)}x (Covenant: ${project.metrics.dscr_covenant}x)\n`;
        }
        if (project.metrics.liquidity_days !== null) {
          content += `Liquidity: ${project.metrics.liquidity_days} days\n`;
        }
        if (project.metrics.cash_runway_months !== null) {
          content += `Cash Runway: ${project.metrics.cash_runway_months} months\n`;
        }
        content += `Reporting: ${project.metrics.reporting_quality || 'unknown'}\n`;
        content += `Sponsor Support: ${project.metrics.sponsor_support_status || 'unknown'}\n`;
      }
      content += `\n${'-'.repeat(80)}\n\n`;
    });

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Watchlist Monitoring Report</title>');
      printWindow.document.write('<style>body { font-family: monospace; white-space: pre; padding: 20px; }</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(content);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getHealthIcon = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'caution':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getHealthColor = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'caution':
        return 'bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Watchlist Monitoring</h1>
          <p className="mt-1 text-sm text-gray-600">Early identification and monitoring of stressed exposures</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-5 h-5" />
          <span>Print Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setHealthFilter('all')}
          className={`bg-white rounded-lg shadow p-6 border-2 transition-all text-left ${
            healthFilter === 'all' ? 'border-gray-500 ring-2 ring-gray-200' : 'border-gray-200 hover:border-gray-400'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Monitored</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{projects.length}</p>
            </div>
            <Binoculars className="w-8 h-8 text-gray-400" />
          </div>
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold mb-1">Watchlist Thresholds:</div>
                <div>Debt: {STATUS_THRESHOLDS.DEBT.WATCHLIST_MIN_DSCR}x ≤ DSCR &lt; {STATUS_THRESHOLDS.DEBT.PERFORMING_MIN_DSCR}x</div>
                <div>Equity: {STATUS_THRESHOLDS.EQUITY.WATCHLIST_MIN_RUNWAY}-{STATUS_THRESHOLDS.EQUITY.PERFORMING_MIN_RUNWAY - 1} months</div>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setHealthFilter(healthFilter === 'caution' ? 'all' : 'caution')}
          className={`bg-white rounded-lg shadow p-6 border-2 transition-all text-left ${
            healthFilter === 'caution' ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-200 hover:border-yellow-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-600">Caution</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{totalCautionCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <div className="text-xs text-yellow-700 mt-2 pt-2 border-t border-yellow-200">
            Projects with 1 negative aspect: Revenue &lt;100% of plan, delayed reporting, or no sponsor support
          </div>
        </button>

        <button
          onClick={() => setHealthFilter(healthFilter === 'critical' ? 'all' : 'critical')}
          className={`bg-white rounded-lg shadow p-6 border-2 transition-all text-left ${
            healthFilter === 'critical' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{totalCriticalCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <div className="text-xs text-red-700 mt-2 pt-2 border-t border-red-200">
            Projects with 2+ negative aspects: Revenue &lt;100% of plan, delayed reporting, or no sponsor support
          </div>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Monitoring Dashboard</h3>
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
          const healthStatus = getHealthStatus(project);
          const isDebt = isDebtInstrument(project.instrument_type);

          return (
            <div
              key={project.id}
              className={`bg-white rounded-lg shadow border-2 p-6 ${getHealthColor(healthStatus)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  {getHealthIcon(healthStatus)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{project.project_name}</h3>
                    <p className="text-sm text-gray-600">{project.unique_project_id} • {project.issuer?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => onSelectProject(project.id)}
                  className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center"
                >
                  View Details
                  <ExternalLink className="ml-1 w-4 h-4" />
                </button>
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
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <TrendingDown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {projects.length === 0
              ? 'No watchlist projects found'
              : 'No projects match the selected filters'}
          </p>
        </div>
      )}
    </div>
  );
}
