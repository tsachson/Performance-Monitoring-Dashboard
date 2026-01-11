import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CashFlowForecast } from '../types/database';
import { TrendingUp, TrendingDown, DollarSign, Edit, Save, X, Plus, AlertCircle } from 'lucide-react';

interface CashFlowForecastProps {
  projectId: string;
}

export function CashFlowForecastComponent({ projectId }: CashFlowForecastProps) {
  const [forecasts, setForecasts] = useState<CashFlowForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<CashFlowForecast>>({});
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    loadForecasts();
  }, [projectId]);

  async function loadForecasts() {
    try {
      const { data, error } = await supabase
        .from('cash_flow_forecasts')
        .select('*')
        .eq('project_id', projectId)
        .order('week_number', { ascending: true });

      if (error) throw error;
      setForecasts(data || []);
    } catch (error) {
      console.error('Error loading cash flow forecasts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function initializeForecasts() {
    setIsInitializing(true);
    try {
      const startDate = new Date();
      const forecastsToCreate: Partial<CashFlowForecast>[] = [];

      for (let i = 1; i <= 13; i++) {
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(startDate.getDate() + (i - 1) * 7);

        forecastsToCreate.push({
          project_id: projectId,
          week_number: i,
          week_start_date: weekStartDate.toISOString().split('T')[0],
          projected_inflows: 0,
          projected_outflows: 0,
          projected_net_cash_flow: 0,
          projected_ending_balance: 0,
        });
      }

      const { error } = await supabase
        .from('cash_flow_forecasts')
        .insert(forecastsToCreate);

      if (error) throw error;
      await loadForecasts();
    } catch (error) {
      console.error('Error initializing forecasts:', error);
      alert('Failed to initialize forecasts. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  }

  function startEdit(forecast: CashFlowForecast) {
    setEditingWeek(forecast.week_number);
    setEditForm({
      id: forecast.id,
      projected_inflows: forecast.projected_inflows,
      projected_outflows: forecast.projected_outflows,
      actual_inflows: forecast.actual_inflows,
      actual_outflows: forecast.actual_outflows,
      notes: forecast.notes
    });
  }

  function cancelEdit() {
    setEditingWeek(null);
    setEditForm({});
  }

  async function saveEdit() {
    if (!editForm.id) return;

    try {
      const projected_net = (editForm.projected_inflows || 0) - (editForm.projected_outflows || 0);
      const actual_net = editForm.actual_inflows !== null && editForm.actual_outflows !== null
        ? (editForm.actual_inflows || 0) - (editForm.actual_outflows || 0)
        : null;

      const variance = actual_net !== null ? actual_net - projected_net : null;

      const previousWeek = forecasts.find(f => f.week_number === editingWeek! - 1);
      const projected_ending = (previousWeek?.projected_ending_balance || 0) + projected_net;
      const actual_ending = actual_net !== null
        ? (previousWeek?.actual_ending_balance || previousWeek?.projected_ending_balance || 0) + actual_net
        : null;

      const { error } = await supabase
        .from('cash_flow_forecasts')
        .update({
          projected_inflows: editForm.projected_inflows,
          projected_outflows: editForm.projected_outflows,
          projected_net_cash_flow: projected_net,
          projected_ending_balance: projected_ending,
          actual_inflows: editForm.actual_inflows,
          actual_outflows: editForm.actual_outflows,
          actual_net_cash_flow: actual_net,
          actual_ending_balance: actual_ending,
          variance: variance,
          notes: editForm.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editForm.id);

      if (error) throw error;

      await recalculateEndingBalances();
      await loadForecasts();
      cancelEdit();
    } catch (error) {
      console.error('Error saving forecast:', error);
      alert('Failed to save forecast. Please try again.');
    }
  }

  async function recalculateEndingBalances() {
    const { data: allForecasts } = await supabase
      .from('cash_flow_forecasts')
      .select('*')
      .eq('project_id', projectId)
      .order('week_number', { ascending: true });

    if (!allForecasts) return;

    let previousProjectedBalance = 0;
    let previousActualBalance = 0;

    for (const forecast of allForecasts) {
      const projectedEnding = previousProjectedBalance + forecast.projected_net_cash_flow;
      const actualEnding = forecast.actual_net_cash_flow !== null
        ? previousActualBalance + forecast.actual_net_cash_flow
        : null;

      await supabase
        .from('cash_flow_forecasts')
        .update({
          projected_ending_balance: projectedEnding,
          actual_ending_balance: actualEnding
        })
        .eq('id', forecast.id);

      previousProjectedBalance = projectedEnding;
      previousActualBalance = actualEnding || projectedEnding;
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (forecasts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">13-Week Rolling Cash Flow Forecast</h3>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">No cash flow forecast has been initialized for this project.</p>
          <button
            onClick={initializeForecasts}
            disabled={isInitializing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{isInitializing ? 'Initializing...' : 'Initialize 13-Week Forecast'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">13-Week Rolling Cash Flow Forecast</h3>
          </div>
          <div className="text-xs text-gray-500">
            Weekly monitoring for active remediation
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Week</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Start Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Proj. Inflows</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Proj. Outflows</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Proj. Net</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Proj. Balance</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-blue-700">Act. Inflows</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-blue-700">Act. Outflows</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-blue-700">Act. Net</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-blue-700">Act. Balance</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-red-700">Variance</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {forecasts.map((forecast) => {
              const isEditing = editingWeek === forecast.week_number;
              const hasActuals = forecast.actual_inflows !== null || forecast.actual_outflows !== null;

              return (
                <tr key={forecast.id} className={`${hasActuals ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">W{forecast.week_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(forecast.week_start_date)}</td>

                  {isEditing ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.projected_inflows || 0}
                          onChange={(e) => setEditForm({ ...editForm, projected_inflows: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.projected_outflows || 0}
                          onChange={(e) => setEditForm({ ...editForm, projected_outflows: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {formatCurrency((editForm.projected_inflows || 0) - (editForm.projected_outflows || 0))}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">-</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.actual_inflows ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, actual_inflows: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="0"
                          className="w-full px-2 py-1 text-sm text-right border border-blue-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.actual_outflows ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, actual_outflows: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="0"
                          className="w-full px-2 py-1 text-sm text-right border border-blue-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-blue-900">
                        {editForm.actual_inflows !== null && editForm.actual_outflows !== null
                          ? formatCurrency((editForm.actual_inflows || 0) - (editForm.actual_outflows || 0))
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-blue-700">-</td>
                      <td className="px-4 py-3 text-sm text-right text-red-700">-</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={saveEdit}
                            className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(forecast.projected_inflows)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(forecast.projected_outflows)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(forecast.projected_net_cash_flow)}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(forecast.projected_ending_balance)}</td>
                      <td className="px-4 py-3 text-sm text-right text-blue-700">{formatCurrency(forecast.actual_inflows)}</td>
                      <td className="px-4 py-3 text-sm text-right text-blue-700">{formatCurrency(forecast.actual_outflows)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-blue-900">{formatCurrency(forecast.actual_net_cash_flow)}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-900">{formatCurrency(forecast.actual_ending_balance)}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        {forecast.variance !== null && (
                          <span className={forecast.variance >= 0 ? 'text-green-700' : 'text-red-700'}>
                            {forecast.variance >= 0 && '+'}
                            {formatCurrency(forecast.variance)}
                          </span>
                        )}
                        {forecast.variance === null && '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => startEdit(forecast)}
                          className="flex items-center justify-center w-full p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-gray-600">Positive variance indicates better than projected performance</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-gray-600">Negative variance requires investigation</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <span className="text-gray-600">Blue rows indicate weeks with actual data recorded</span>
          </div>
        </div>
      </div>
    </div>
  );
}
