import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ProjectWithIssuer,
  PaymentHistory,
  FinancialSnapshot,
  WatchlistMetrics,
  ProjectStatusHistory,
  SupportNetworkContact
} from '../types/database';
import { ArrowLeft, TrendingUp, TrendingDown, AlertCircle, Users, Calendar, DollarSign, Edit, Save, X, Printer } from 'lucide-react';
import { EditProjectModal } from './EditProjectModal';
import { EditContactModal } from './EditContactModal';
import ProjectDiaryComponent from './ProjectDiary';
import ProjectReminders from './ProjectReminders';
import { CashFlowForecastComponent } from './CashFlowForecast';
import { CovenantTracking } from './CovenantTracking';
import { StakeholderMapping } from './StakeholderMapping';
import { trackStatusChange } from '../lib/statusTracking';
import { calculateProjectStatus } from '../lib/projectStatus';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const [project, setProject] = useState<ProjectWithIssuer | null>(null);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [metrics, setMetrics] = useState<WatchlistMetrics | null>(null);
  const [history, setHistory] = useState<ProjectStatusHistory[]>([]);
  const [contacts, setContacts] = useState<SupportNetworkContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectEdit, setShowProjectEdit] = useState(false);
  const [showContactEdit, setShowContactEdit] = useState(false);
  const [editingRiskScore, setEditingRiskScore] = useState(false);
  const [newRiskScore, setNewRiskScore] = useState<number | null>(null);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  async function loadProjectData() {
    try {
      const [
        projectRes,
        paymentsRes,
        snapshotsRes,
        metricsRes,
        historyRes,
        contactsRes
      ] = await Promise.all([
        supabase.from('projects').select('*, issuer:issuers(*)').eq('id', projectId).single(),
        supabase.from('payment_history').select('*').eq('project_id', projectId).order('payment_date', { ascending: false }).limit(10),
        supabase.from('financial_snapshots').select('*').eq('project_id', projectId).order('snapshot_date', { ascending: false }),
        supabase.from('watchlist_metrics').select('*').eq('project_id', projectId).maybeSingle(),
        supabase.from('project_status_history').select('*').eq('project_id', projectId).order('status_date', { ascending: false }),
        supabase.from('support_network_contacts').select('*').eq('project_id', projectId)
      ]);

      if (projectRes.data) {
        setProject(projectRes.data as ProjectWithIssuer);
        if (metricsRes.data) {
          await trackStatusChange(projectId, projectRes.data, metricsRes.data);
        }
      }
      if (paymentsRes.data) setPayments(paymentsRes.data);
      if (snapshotsRes.data) setSnapshots(snapshotsRes.data);
      if (metricsRes.data) {
        setMetrics(metricsRes.data);
        setNewRiskScore(metricsRes.data.risk_score);
      }

      const { data: updatedHistory } = await supabase
        .from('project_status_history')
        .select('*')
        .eq('project_id', projectId)
        .order('status_date', { ascending: false });

      if (updatedHistory) setHistory(updatedHistory);
      if (contactsRes.data) setContacts(contactsRes.data);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRiskScore() {
    if (newRiskScore === null || newRiskScore < 0 || newRiskScore > 100) {
      alert('Risk score must be between 0 and 100');
      return;
    }

    try {
      const { error } = await supabase
        .from('watchlist_metrics')
        .update({ risk_score: newRiskScore, updated_at: new Date().toISOString() })
        .eq('project_id', projectId);

      if (error) throw error;

      const updatedMetrics = { ...metrics!, risk_score: newRiskScore };
      setMetrics(updatedMetrics);
      setEditingRiskScore(false);

      if (project) {
        await trackStatusChange(projectId, project, updatedMetrics);
        await loadProjectData();
      }
    } catch (error) {
      console.error('Error saving risk score:', error);
      alert('Failed to save risk score. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) return <div>Project not found</div>;

  const currentStatus = calculateProjectStatus(project, metrics);

  const formatCurrency = (value: number, currency?: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || project.issuance_currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'performing': return 'bg-green-100 text-green-800';
      case 'watch-list': return 'bg-yellow-100 text-yellow-800';
      case 'remediation-required': return 'bg-red-100 text-red-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePrint = async () => {
    let printContent = `PROJECT DETAILS REPORT\n`;
    printContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    printContent += `=== PROJECT INFORMATION ===\n`;
    printContent += `Project: ${project.project_name}\n`;
    printContent += `ID: ${project.unique_project_id}\n`;
    printContent += `Status: ${currentStatus}\n`;
    if (project.current_status === 'closed' && project.closure_type) {
      printContent += `Closure Type: ${project.closure_type}\n`;
    }
    printContent += `Country: ${project.country}\n\n`;

    printContent += `=== ISSUER DETAILS ===\n`;
    printContent += `Name: ${project.issuer.name}\n`;
    printContent += `Type: ${project.issuer.issuer_type}\n`;
    printContent += `Sector: ${project.issuer.industry_sector}\n`;
    if (project.issuer.contact_name) printContent += `Contact: ${project.issuer.contact_name}\n`;
    if (project.issuer.contact_email) printContent += `Email: ${project.issuer.contact_email}\n`;
    if (project.issuer.contact_phone) printContent += `Phone: ${project.issuer.contact_phone}\n`;
    printContent += `\n`;

    printContent += `=== INVESTMENT DETAILS ===\n`;
    printContent += `Deal Size: ${formatCurrency(project.deal_size)}\n`;
    printContent += `Instrument Type: ${project.instrument_type}\n`;
    if (project.rating) printContent += `Rating: ${project.rating}\n`;
    if (project.interest_rate) printContent += `Interest Rate: ${project.interest_rate}% ${project.rate_type}\n`;
    if (project.dividend_rate) printContent += `Dividend Rate: ${project.dividend_rate}%\n`;
    printContent += `Issuance Date: ${formatDate(project.issuance_date)}\n`;
    if (project.maturity_date) printContent += `Maturity Date: ${formatDate(project.maturity_date)}\n`;
    if (project.tenure_years) printContent += `Tenure: ${project.tenure_years} years\n`;
    printContent += `\n`;

    if (metrics) {
      printContent += `=== CURRENT PERFORMANCE METRICS ===\n`;
      if (metrics.dscr_current !== null) printContent += `DSCR: ${metrics.dscr_current.toFixed(2)}x (Covenant: ${metrics.dscr_covenant}x)\n`;
      if (metrics.liquidity_days !== null) printContent += `Liquidity: ${metrics.liquidity_days} days of coverage\n`;
      if (metrics.cash_runway_months !== null) printContent += `Cash Runway: ${metrics.cash_runway_months} months\n`;
      if (metrics.covenant_headroom_pct !== null) printContent += `Covenant Headroom: ${metrics.covenant_headroom_pct.toFixed(1)}%\n`;
      if (metrics.revenue_vs_plan_pct !== null) printContent += `Revenue vs Plan: ${metrics.revenue_vs_plan_pct.toFixed(0)}%\n`;
      if (metrics.reporting_quality) printContent += `Reporting Quality: ${metrics.reporting_quality}\n`;
      if (metrics.sponsor_support_status) printContent += `Sponsor Support: ${metrics.sponsor_support_status}\n`;
      printContent += `Risk Score: ${metrics.risk_score ?? 'N/A'}/100\n\n`;
    }

    if (snapshots.length > 0) {
      printContent += `=== FINANCIAL PERFORMANCE (LAST 4 QUARTERS) ===\n`;
      snapshots.forEach(snapshot => {
        printContent += `\n${snapshot.quarter}:\n`;
        printContent += `  Revenue: ${formatCurrency(snapshot.revenue)}\n`;
        printContent += `  EBITDA: ${formatCurrency(snapshot.ebitda)}\n`;
        printContent += `  EBIT: ${formatCurrency(snapshot.ebit)}\n`;
        printContent += `  Cash Balance: ${formatCurrency(snapshot.cash_balance)}\n`;
      });
      printContent += `\n`;
    }

    if (payments.length > 0) {
      printContent += `=== RECENT PAYMENT HISTORY ===\n`;
      payments.forEach(payment => {
        printContent += `\n${formatDate(payment.payment_date)}:\n`;
        printContent += `  Amount Due: ${formatCurrency(payment.amount_due)}\n`;
        printContent += `  Amount Paid: ${formatCurrency(payment.amount_paid)}\n`;
        if (payment.deficit_amount > 0) {
          printContent += `  Deficit: ${formatCurrency(payment.deficit_amount)}\n`;
        }
        printContent += `  Status: ${payment.payment_status}\n`;
      });
      printContent += `\n`;
    }

    const { data: diaries } = await supabase
      .from('project_diaries')
      .select('*')
      .eq('project_id', projectId)
      .order('entry_date', { ascending: false })
      .limit(10);

    if (diaries && diaries.length > 0) {
      printContent += `=== PROJECT DIARY (RECENT ENTRIES) ===\n`;
      diaries.forEach(entry => {
        printContent += `\n${formatDate(entry.entry_date)}:\n`;
        printContent += `  ${entry.entry_text}\n`;
        if (entry.created_by) printContent += `  By: ${entry.created_by}\n`;
      });
      printContent += `\n`;
    }

    const { data: reminders } = await supabase
      .from('project_reminders')
      .select('*')
      .eq('project_id', projectId)
      .order('reminder_date', { ascending: true });

    if (reminders && reminders.length > 0) {
      printContent += `=== REMINDERS & ALERTS ===\n`;
      reminders.forEach(reminder => {
        printContent += `\n${formatDate(reminder.reminder_date)}${reminder.is_completed ? ' (COMPLETED)' : ''}:\n`;
        printContent += `  ${reminder.reminder_text}\n`;
        if (reminder.created_by) printContent += `  Created by: ${reminder.created_by}\n`;
        if (reminder.completed_at) printContent += `  Completed: ${formatDate(reminder.completed_at)}\n`;
      });
      printContent += `\n`;
    }

    if (contacts.length > 0) {
      printContent += `=== SUPPORT NETWORK ===\n`;
      contacts.forEach(contact => {
        printContent += `\n${contact.team_type} Team${contact.is_primary ? ' (Primary)' : ''}:\n`;
        printContent += `  Name: ${contact.contact_name}\n`;
        if (contact.contact_title) printContent += `  Title: ${contact.contact_title}\n`;
        if (contact.contact_email) printContent += `  Email: ${contact.contact_email}\n`;
        if (contact.contact_phone) printContent += `  Phone: ${contact.contact_phone}\n`;
      });
      printContent += `\n`;
    }

    if (history.length > 0) {
      printContent += `=== STATUS HISTORY ===\n`;
      history.forEach(entry => {
        printContent += `\n${formatDate(entry.status_date)}:\n`;
        printContent += `  Status: ${entry.status}\n`;
        if (entry.sub_status) printContent += `  Sub-status: ${entry.sub_status}\n`;
        if (entry.notes) printContent += `  Notes: ${entry.notes}\n`;
        if (entry.changed_by) printContent += `  Changed by: ${entry.changed_by}\n`;
      });
    }

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Project Details - ' + project.project_name + '</title>');
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
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{project.project_name}</h1>
          <p className="text-sm text-gray-600 mt-1">{project.unique_project_id}</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Print Report</span>
        </button>
        <button
          onClick={() => setShowProjectEdit(true)}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Edit className="w-4 h-4" />
          <span>Edit Project</span>
        </button>
        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(currentStatus)}`}>
          {currentStatus}
        </span>
      </div>

      {project.current_status === 'closed' && project.closure_type && (
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-900">Project Closed:</span>
            <span className="text-gray-700">
              {project.closure_type === 'fully-satisfied' && 'Fully Satisfied (off the books)'}
              {project.closure_type === 'with-restructuring' && 'Closed with Restructuring'}
              {project.closure_type === 'partial-loss' && 'Closed with Partial Loss'}
              {project.closure_type === 'complete-loss' && 'Written Off - Complete Loss'}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Investment Details</h3>
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-600">Deal Size</dt>
              <dd className="font-semibold text-gray-900">{formatCurrency(project.deal_size)}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Instrument Type</dt>
              <dd className="font-semibold text-gray-900">{project.instrument_type}</dd>
            </div>
            {project.rating && (
              <div>
                <dt className="text-gray-600">Rating</dt>
                <dd className="font-semibold text-gray-900">{project.rating}</dd>
              </div>
            )}
            {project.interest_rate && (
              <div>
                <dt className="text-gray-600">Interest Rate</dt>
                <dd className="font-semibold text-gray-900">{project.interest_rate}% {project.rate_type}</dd>
              </div>
            )}
            {project.dividend_rate && (
              <div>
                <dt className="text-gray-600">Dividend Rate</dt>
                <dd className="font-semibold text-gray-900">{project.dividend_rate}%</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Timeline</h3>
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-600">Issuance Date</dt>
              <dd className="font-semibold text-gray-900">{formatDate(project.issuance_date)}</dd>
            </div>
            {project.maturity_date && (
              <div>
                <dt className="text-gray-600">Maturity Date</dt>
                <dd className="font-semibold text-gray-900">{formatDate(project.maturity_date)}</dd>
              </div>
            )}
            {project.tenure_years && (
              <div>
                <dt className="text-gray-600">Tenure</dt>
                <dd className="font-semibold text-gray-900">{project.tenure_years} years</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-600">Country</dt>
              <dd className="font-semibold text-gray-900">{project.country}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Issuer</h3>
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-600">Name</dt>
              <dd className="font-semibold text-gray-900">{project.issuer.name}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Type</dt>
              <dd className="font-semibold text-gray-900">{project.issuer.issuer_type}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Sector</dt>
              <dd className="font-semibold text-gray-900">{project.issuer.industry_sector}</dd>
            </div>
            {project.issuer.contact_name && (
              <div>
                <dt className="text-gray-600">Contact</dt>
                <dd className="font-semibold text-gray-900">{project.issuer.contact_name}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {metrics && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {metrics.dscr_current !== null && (
              <div>
                <p className="text-sm text-gray-600">DSCR</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.dscr_current.toFixed(2)}x</p>
                <p className="text-xs text-gray-500 mt-1">Covenant: {metrics.dscr_covenant}x</p>
              </div>
            )}
            {metrics.liquidity_days !== null && (
              <div>
                <p className="text-sm text-gray-600">Liquidity</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.liquidity_days}</p>
                <p className="text-xs text-gray-500 mt-1">days of coverage</p>
              </div>
            )}
            {metrics.cash_runway_months !== null && (
              <div>
                <p className="text-sm text-gray-600">Cash Runway</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.cash_runway_months}</p>
                <p className="text-xs text-gray-500 mt-1">months remaining</p>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-gray-600">Risk Score</p>
                {!editingRiskScore && (
                  <button
                    onClick={() => setEditingRiskScore(true)}
                    className="text-blue-600 hover:text-blue-700 p-1"
                    title="Edit Risk Score"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                )}
              </div>
              {editingRiskScore ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRiskScore ?? ''}
                    onChange={(e) => setNewRiskScore(e.target.value ? Number(e.target.value) : null)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSaveRiskScore}
                    className="text-green-600 hover:text-green-700 p-1"
                    title="Save"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingRiskScore(false);
                      setNewRiskScore(metrics?.risk_score ?? null);
                    }}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className={`text-2xl font-bold ${
                  metrics.risk_score === null ? 'text-gray-400' :
                  metrics.risk_score > 60 ? 'text-red-600' :
                  metrics.risk_score > 40 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {metrics.risk_score ?? 'N/A'}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {editingRiskScore ? 'Enter 0-100' : 'out of 100'}
              </p>
            </div>
          </div>
        </div>
      )}

      {snapshots.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Performance (Last 4 Quarters)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quarter</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">EBITDA</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">EBIT</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{snapshot.quarter}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(snapshot.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(snapshot.ebitda)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(snapshot.ebit)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(snapshot.cash_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {payments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payment History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount Due</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deficit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(payment.payment_date)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(payment.amount_due)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(payment.amount_paid)}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">{payment.deficit_amount > 0 ? formatCurrency(payment.deficit_amount) : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        payment.payment_status === 'on-time' ? 'bg-green-100 text-green-800' :
                        payment.payment_status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                        payment.payment_status === 'partial' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Support Network</h3>
          <button
            onClick={() => setShowContactEdit(true)}
            className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Contacts</span>
          </button>
        </div>
        {contacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-600 uppercase">{contact.team_type}</span>
                  {contact.is_primary && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Primary</span>
                  )}
                </div>
                <p className="font-medium text-gray-900">{contact.contact_name}</p>
                {contact.contact_title && (
                  <p className="text-sm text-gray-600">{contact.contact_title}</p>
                )}
                {contact.contact_email && (
                  <p className="text-sm text-blue-600 mt-2">{contact.contact_email}</p>
                )}
                {contact.contact_phone && (
                  <p className="text-sm text-gray-600">{contact.contact_phone}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No contacts added. Click "Edit Contacts" to add team contacts.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectDiaryComponent projectId={projectId} />
        <ProjectReminders projectId={projectId} />
      </div>

      {(currentStatus === 'watch-list' || currentStatus === 'remediation-required') && (
        <>
          <CovenantTracking projectId={projectId} />

          <StakeholderMapping projectId={projectId} />
        </>
      )}

      {currentStatus === 'remediation-required' && (
        <CashFlowForecastComponent projectId={projectId} />
      )}

      {history.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div key={entry.id} className="flex">
                <div className="flex flex-col items-center mr-4">
                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                  {index < history.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </span>
                    <span className="text-sm text-gray-500">{formatDate(entry.status_date)}</span>
                  </div>
                  {entry.sub_status && (
                    <p className="text-sm text-gray-600 mt-1">{entry.sub_status}</p>
                  )}
                  {entry.notes && (
                    <p className="text-sm text-gray-700 mt-2">{entry.notes}</p>
                  )}
                  {entry.changed_by && (
                    <p className="text-xs text-gray-500 mt-1">Changed by: {entry.changed_by}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showProjectEdit && project && (
        <EditProjectModal
          project={project}
          onClose={() => setShowProjectEdit(false)}
          onUpdate={loadProjectData}
        />
      )}

      {showContactEdit && (
        <EditContactModal
          projectId={projectId}
          contacts={contacts}
          onClose={() => setShowContactEdit(false)}
          onUpdate={loadProjectData}
        />
      )}
    </div>
  );
}
