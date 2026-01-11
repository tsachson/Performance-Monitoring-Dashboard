import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Covenant } from '../types/database';
import { Shield, AlertTriangle, CheckCircle, AlertCircle, Plus, Edit, Save, X, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CovenantTrackingProps {
  projectId: string;
}

export function CovenantTracking({ projectId }: CovenantTrackingProps) {
  const [covenants, setCovenants] = useState<Covenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Covenant>>({});

  useEffect(() => {
    loadCovenants();
  }, [projectId]);

  async function loadCovenants() {
    try {
      const { data, error } = await supabase
        .from('covenants')
        .select('*')
        .eq('project_id', projectId)
        .order('covenant_type', { ascending: true });

      if (error) throw error;
      setCovenants(data || []);
    } catch (error) {
      console.error('Error loading covenants:', error);
    } finally {
      setLoading(false);
    }
  }

  function startAdd() {
    setIsAdding(true);
    setEditForm({
      project_id: projectId,
      covenant_name: '',
      covenant_type: 'DSCR',
      threshold_value: 0,
      threshold_operator: '>=',
      current_value: null,
      testing_frequency: 'quarterly',
      is_active: true,
      trend: null
    });
  }

  function startEdit(covenant: Covenant) {
    setEditingId(covenant.id);
    setEditForm({ ...covenant });
  }

  function cancelEdit() {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({});
  }

  async function saveAdd() {
    if (!editForm.covenant_name || !editForm.threshold_value) {
      alert('Please fill in covenant name and threshold value');
      return;
    }

    try {
      const headroom = editForm.current_value && editForm.threshold_value
        ? calculateHeadroom(editForm.current_value, editForm.threshold_value, editForm.threshold_operator!)
        : null;

      const { error } = await supabase
        .from('covenants')
        .insert({
          project_id: editForm.project_id,
          covenant_name: editForm.covenant_name,
          covenant_type: editForm.covenant_type,
          threshold_value: editForm.threshold_value,
          threshold_operator: editForm.threshold_operator,
          current_value: editForm.current_value,
          headroom_pct: headroom,
          trend: editForm.trend,
          last_tested_date: editForm.last_tested_date,
          testing_frequency: editForm.testing_frequency,
          breach_consequence: editForm.breach_consequence,
          is_active: editForm.is_active
        });

      if (error) throw error;
      await loadCovenants();
      cancelEdit();
    } catch (error) {
      console.error('Error adding covenant:', error);
      alert('Failed to add covenant. Please try again.');
    }
  }

  async function saveEdit() {
    if (!editingId || !editForm.covenant_name || !editForm.threshold_value) {
      alert('Please fill in covenant name and threshold value');
      return;
    }

    try {
      const headroom = editForm.current_value && editForm.threshold_value
        ? calculateHeadroom(editForm.current_value, editForm.threshold_value, editForm.threshold_operator!)
        : null;

      const { error } = await supabase
        .from('covenants')
        .update({
          covenant_name: editForm.covenant_name,
          covenant_type: editForm.covenant_type,
          threshold_value: editForm.threshold_value,
          threshold_operator: editForm.threshold_operator,
          current_value: editForm.current_value,
          headroom_pct: headroom,
          trend: editForm.trend,
          last_tested_date: editForm.last_tested_date,
          testing_frequency: editForm.testing_frequency,
          breach_consequence: editForm.breach_consequence,
          is_active: editForm.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      await loadCovenants();
      cancelEdit();
    } catch (error) {
      console.error('Error updating covenant:', error);
      alert('Failed to update covenant. Please try again.');
    }
  }

  async function deleteCovenant(id: string) {
    if (!confirm('Are you sure you want to delete this covenant?')) return;

    try {
      const { error } = await supabase
        .from('covenants')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadCovenants();
    } catch (error) {
      console.error('Error deleting covenant:', error);
      alert('Failed to delete covenant. Please try again.');
    }
  }

  function calculateHeadroom(current: number, threshold: number, operator: string): number {
    switch (operator) {
      case '>=':
        return ((current - threshold) / threshold) * 100;
      case '>':
        return ((current - threshold) / threshold) * 100;
      case '<=':
        return ((threshold - current) / threshold) * 100;
      case '<':
        return ((threshold - current) / threshold) * 100;
      default:
        return 0;
    }
  }

  function getComplianceStatus(covenant: Covenant): 'compliant' | 'warning' | 'breach' | 'unknown' {
    if (covenant.current_value === null) return 'unknown';

    const { current_value, threshold_value, threshold_operator } = covenant;
    let isCompliant = false;

    switch (threshold_operator) {
      case '>=':
        isCompliant = current_value >= threshold_value;
        break;
      case '>':
        isCompliant = current_value > threshold_value;
        break;
      case '<=':
        isCompliant = current_value <= threshold_value;
        break;
      case '<':
        isCompliant = current_value < threshold_value;
        break;
    }

    if (!isCompliant) return 'breach';

    const headroomPct = covenant.headroom_pct || 0;
    if (headroomPct < 10) return 'warning';

    return 'compliant';
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'breach':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'compliant':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'breach':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  }

  function getTrendIcon(trend: string | null) {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  function getOperatorText(operator: string): string {
    switch (operator) {
      case '>=':
        return 'greater than or equal to';
      case '>':
        return 'greater than';
      case '<=':
        return 'less than or equal to';
      case '<':
        return 'less than';
      default:
        return operator;
    }
  }

  function formatThresholdDescription(covenant: Covenant): string {
    const operatorText = getOperatorText(covenant.threshold_operator);
    const value = covenant.threshold_value.toFixed(2);
    return `The trigger is a ${covenant.covenant_type} ${operatorText} ${value}`;
  }

  function getCovenantFormula(covenantType: string): string | null {
    switch (covenantType) {
      case 'DSCR':
        return 'DSCR = Net Operating Income ÷ Total Debt Service';
      case 'Fixed Charge Coverage':
        return 'FCCR = (EBIT + Fixed Charges Before Taxes) ÷ (Fixed Charges Before Taxes + Interest Expense)';
      case 'Debt-to-Equity':
        return 'D/E = Total Debt ÷ Total Equity';
      case 'Interest Coverage':
        return 'Interest Coverage = EBIT ÷ Interest Expense';
      case 'Current Ratio':
        return 'Current Ratio = Current Assets ÷ Current Liabilities';
      case 'Minimum Cash':
        return 'Minimum Cash = Available Cash and Cash Equivalents';
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const activeCovenants = covenants.filter(c => c.is_active);
  const breachCount = activeCovenants.filter(c => getComplianceStatus(c) === 'breach').length;
  const warningCount = activeCovenants.filter(c => getComplianceStatus(c) === 'warning').length;
  const compliantCount = activeCovenants.filter(c => getComplianceStatus(c) === 'compliant').length;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Covenant Tracking & Headroom Dashboard</h3>
          </div>
          <button
            onClick={startAdd}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Covenant</span>
          </button>
        </div>

        {activeCovenants.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-900">Compliant</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700 mt-1">{compliantCount}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-900">Warning (&lt;10%)</span>
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-700 mt-1">{warningCount}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-900">Breach</span>
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-700 mt-1">{breachCount}</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        {isAdding && (
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">Add New Covenant</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Covenant Name</label>
                <input
                  type="text"
                  value={editForm.covenant_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, covenant_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="e.g., Minimum DSCR"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Covenant Type</label>
                <select
                  value={editForm.covenant_type || 'DSCR'}
                  onChange={(e) => setEditForm({ ...editForm, covenant_type: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="DSCR">DSCR</option>
                  <option value="Debt-to-Equity">Debt-to-Equity</option>
                  <option value="Interest Coverage">Interest Coverage</option>
                  <option value="Minimum Cash">Minimum Cash</option>
                  <option value="Current Ratio">Current Ratio</option>
                  <option value="Fixed Charge Coverage">Fixed Charge Coverage</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Operator</label>
                <select
                  value={editForm.threshold_operator || '>='}
                  onChange={(e) => setEditForm({ ...editForm, threshold_operator: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value=">=">greater than or equal to</option>
                  <option value=">">greater than</option>
                  <option value="<=">less than or equal to</option>
                  <option value="<">less than</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Threshold Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.threshold_value || ''}
                  onChange={(e) => setEditForm({ ...editForm, threshold_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Current Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.current_value ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, current_value: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Testing Frequency</label>
                <select
                  value={editForm.testing_frequency || 'quarterly'}
                  onChange={(e) => setEditForm({ ...editForm, testing_frequency: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="quarterly">Quarterly</option>
                  <option value="semi-annual">Semi-Annual</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Breach Consequence</label>
                <input
                  type="text"
                  value={editForm.breach_consequence || ''}
                  onChange={(e) => setEditForm({ ...editForm, breach_consequence: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="e.g., Event of Default, Mandatory prepayment"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 mt-3">
              <button
                onClick={saveAdd}
                className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center space-x-1 px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 text-sm"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        {activeCovenants.map((covenant) => {
          const status = getComplianceStatus(covenant);
          const isEditing = editingId === covenant.id;

          if (isEditing) {
            return (
              <div key={covenant.id} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-300">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Edit Covenant</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Covenant Name</label>
                    <input
                      type="text"
                      value={editForm.covenant_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, covenant_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Covenant Type</label>
                    <select
                      value={editForm.covenant_type || 'DSCR'}
                      onChange={(e) => setEditForm({ ...editForm, covenant_type: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="DSCR">DSCR</option>
                      <option value="Debt-to-Equity">Debt-to-Equity</option>
                      <option value="Interest Coverage">Interest Coverage</option>
                      <option value="Minimum Cash">Minimum Cash</option>
                      <option value="Current Ratio">Current Ratio</option>
                      <option value="Fixed Charge Coverage">Fixed Charge Coverage</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Operator</label>
                    <select
                      value={editForm.threshold_operator || '>='}
                      onChange={(e) => setEditForm({ ...editForm, threshold_operator: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value=">=">greater than or equal to</option>
                      <option value=">">greater than</option>
                      <option value="<=">less than or equal to</option>
                      <option value="<">less than</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Threshold Value</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.threshold_value || ''}
                      onChange={(e) => setEditForm({ ...editForm, threshold_value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Current Value</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.current_value ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, current_value: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Trend</label>
                    <select
                      value={editForm.trend || ''}
                      onChange={(e) => setEditForm({ ...editForm, trend: e.target.value ? e.target.value as any : null })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="">Not Set</option>
                      <option value="improving">Improving</option>
                      <option value="stable">Stable</option>
                      <option value="declining">Declining</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Testing Frequency</label>
                    <select
                      value={editForm.testing_frequency || 'quarterly'}
                      onChange={(e) => setEditForm({ ...editForm, testing_frequency: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="quarterly">Quarterly</option>
                      <option value="semi-annual">Semi-Annual</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Last Tested</label>
                    <input
                      type="date"
                      value={editForm.last_tested_date || ''}
                      onChange={(e) => setEditForm({ ...editForm, last_tested_date: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Breach Consequence</label>
                    <input
                      type="text"
                      value={editForm.breach_consequence || ''}
                      onChange={(e) => setEditForm({ ...editForm, breach_consequence: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-2 mt-3">
                  <button
                    onClick={saveEdit}
                    className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center space-x-1 px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 text-sm"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={covenant.id} className={`rounded-lg p-4 border-2 ${getStatusColor(status)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(status)}
                  <div>
                    <h4 className="font-semibold text-gray-900">{covenant.covenant_name}</h4>
                    <span className="text-xs text-gray-600">{covenant.covenant_type}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startEdit(covenant)}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCovenant(covenant.id)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mb-3 pb-3 border-b border-gray-200">
                <p className="text-sm text-gray-900 leading-relaxed">
                  {formatThresholdDescription(covenant)}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Current Value</p>
                  <p className="font-semibold text-gray-900">
                    {covenant.current_value !== null ? covenant.current_value.toFixed(2) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Headroom</p>
                  <p className={`font-bold ${
                    covenant.headroom_pct === null ? 'text-gray-400' :
                    covenant.headroom_pct < 0 ? 'text-red-600' :
                    covenant.headroom_pct < 10 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {covenant.headroom_pct !== null ? covenant.headroom_pct.toFixed(1) + '%' : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Trend</p>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(covenant.trend)}
                    <span className="text-sm font-medium text-gray-700">
                      {covenant.trend || '-'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Last Tested</p>
                  <p className="text-sm text-gray-700">{formatDate(covenant.last_tested_date)}</p>
                  <p className="text-xs text-gray-500">{covenant.testing_frequency}</p>
                </div>
              </div>

              {getCovenantFormula(covenant.covenant_type) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 italic">
                    <span className="font-semibold text-gray-600">Formula: </span>
                    {getCovenantFormula(covenant.covenant_type)}
                  </p>
                </div>
              )}

              {covenant.breach_consequence && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600">Breach Consequence:</p>
                  <p className="text-sm text-gray-900 mt-1">{covenant.breach_consequence}</p>
                </div>
              )}
            </div>
          );
        })}

        {activeCovenants.length === 0 && !isAdding && (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No covenants tracked. Click "Add Covenant" to start monitoring.</p>
          </div>
        )}
      </div>
    </div>
  );
}
