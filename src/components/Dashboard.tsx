import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Project, WatchlistMetrics } from '../types/database';
import { calculateProjectStatus, STATUS_THRESHOLDS } from '../lib/projectStatus';
import { trackStatusChange } from '../lib/statusTracking';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Activity, Printer, Binoculars } from 'lucide-react';

interface DashboardStats {
  totalProjects: number;
  totalInvestment: number;
  performing: number;
  watchlist: number;
  remediation: number;
  closed: number;
}

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('*');

      const { data: metrics } = await supabase
        .from('watchlist_metrics')
        .select('*');

      if (projects) {
        const metricsMap = new Map<string, WatchlistMetrics>();
        (metrics || []).forEach(m => metricsMap.set(m.project_id, m));

        for (const project of projects) {
          await trackStatusChange(project.id, project, metricsMap.get(project.id) || null);
        }

        const projectsWithCalculatedStatus = projects.map(p => ({
          ...p,
          calculatedStatus: calculateProjectStatus(p, metricsMap.get(p.id))
        }));

        const activeProjects = projectsWithCalculatedStatus.filter(p => p.calculatedStatus !== 'closed');
        const totalInvestment = activeProjects.reduce((sum, p) => sum + p.deal_size, 0);
        const performing = projectsWithCalculatedStatus.filter(p => p.calculatedStatus === 'performing').length;
        const watchlist = projectsWithCalculatedStatus.filter(p => p.calculatedStatus === 'watch-list').length;
        const remediation = projectsWithCalculatedStatus.filter(p => p.calculatedStatus === 'remediation-required').length;
        const closed = projectsWithCalculatedStatus.filter(p => p.calculatedStatus === 'closed').length;

        setStats({
          totalProjects: activeProjects.length,
          totalInvestment,
          performing,
          watchlist,
          remediation,
          closed
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handlePrint = () => {
    const printContent = `
PERFORMANCE MONITORING DASHBOARD - PORTFOLIO STATUS REPORT
Generated: ${new Date().toLocaleString()}

PORTFOLIO SUMMARY
-----------------
Total Active Projects: ${stats?.totalProjects}
Total Investment: ${formatCurrency(stats?.totalInvestment || 0)}

PROJECT STATUS BREAKDOWN
------------------------
Performing: ${stats?.performing} (${stats && stats.totalProjects > 0 ? ((stats.performing / stats.totalProjects) * 100).toFixed(1) : '0.0'}%)
Watchlist: ${stats?.watchlist}
Remediation: ${stats?.remediation}
Recently Closed: ${stats?.closed}
Total Projects Requiring Attention: ${(stats?.watchlist || 0) + (stats?.remediation || 0)}
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Performance Monitoring Dashboard - Portfolio Report</title>');
      printWindow.document.write('<style>body { font-family: monospace; white-space: pre; padding: 20px; }</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(printContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Overview</h1>
          <p className="mt-1 text-sm text-gray-600">Monitor your investment portfolio performance and risk metrics</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-5 h-5" />
          Print Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          onClick={() => onNavigate('projects')}
          className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all text-left cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Investment</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalInvestment)}</p>
              <p className="text-xs text-gray-500 mt-1">Hypothetical Portfolio</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {stats.totalProjects} active projects
          </div>
        </button>

        <button
          onClick={() => onNavigate('performing')}
          className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:border-green-400 hover:shadow-lg transition-all text-left cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Performing</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{stats.performing}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {stats.totalProjects > 0 ? ((stats.performing / stats.totalProjects) * 100).toFixed(1) : '0.0'}% of active portfolio
          </div>
        </button>

        <button
          onClick={() => onNavigate('watchlist')}
          className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:border-yellow-400 hover:shadow-lg transition-all text-left cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Watchlist</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.watchlist}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Binoculars className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Elevated monitoring required
          </div>
        </button>

        <button
          onClick={() => onNavigate('remediation')}
          className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:border-red-400 hover:shadow-lg transition-all text-left cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Remediation</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{stats.remediation}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Active workout management
          </div>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Portfolio Status</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Performing</span>
              <span className="font-medium text-gray-900">{stats.performing} projects</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${stats.totalProjects > 0 ? (stats.performing / stats.totalProjects) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Watchlist</span>
              <span className="font-medium text-gray-900">{stats.watchlist} projects</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${stats.totalProjects > 0 ? (stats.watchlist / stats.totalProjects) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Remediation</span>
              <span className="font-medium text-gray-900">{stats.remediation} projects</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${stats.totalProjects > 0 ? (stats.remediation / stats.totalProjects) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        {stats.closed > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Recently Closed-Out Projects</span>
              <span className="font-medium text-gray-500">{stats.closed}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-lg shadow p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-slate-600" />
          Status Classification Thresholds
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Debt Instruments</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-900">Performing:</span>
                  <span className="text-slate-600 ml-1">DSCR ≥ {STATUS_THRESHOLDS.DEBT.PERFORMING_MIN_DSCR}x</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Binoculars className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-900">Watchlist:</span>
                  <span className="text-slate-600 ml-1">{STATUS_THRESHOLDS.DEBT.WATCHLIST_MIN_DSCR}x ≤ DSCR &lt; {STATUS_THRESHOLDS.DEBT.PERFORMING_MIN_DSCR}x</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-900">Remediation:</span>
                  <span className="text-slate-600 ml-1">DSCR &lt; {STATUS_THRESHOLDS.DEBT.WATCHLIST_MIN_DSCR}x</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Equity Instruments</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-900">Performing:</span>
                  <span className="text-slate-600 ml-1">Cash Runway ≥ {STATUS_THRESHOLDS.EQUITY.PERFORMING_MIN_RUNWAY} months</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Binoculars className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-900">Watchlist:</span>
                  <span className="text-slate-600 ml-1">{STATUS_THRESHOLDS.EQUITY.WATCHLIST_MIN_RUNWAY}-{STATUS_THRESHOLDS.EQUITY.PERFORMING_MIN_RUNWAY - 1} months</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-slate-900">Remediation:</span>
                  <span className="text-slate-600 ml-1">Cash Runway &lt; {STATUS_THRESHOLDS.EQUITY.WATCHLIST_MIN_RUNWAY} months</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-900">
            <span className="font-semibold">Note:</span> These thresholds are uniform across all sectors and countries for this demonstration. In practice, sector-specific and country-specific sensitivities may require adjusted thresholds (e.g., telecom infrastructure projects may require higher DSCR than gas-fired power plants).
          </p>
        </div>
      </div>
    </div>
  );
}
