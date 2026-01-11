import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Stakeholder } from '../types/database';
import { Users, Plus, Edit, Save, X, Trash2, TrendingUp, TrendingDown, Minus, Building2, User, Shield } from 'lucide-react';

interface StakeholderMappingProps {
  projectId: string;
}

export function StakeholderMapping({ projectId }: StakeholderMappingProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | Stakeholder['stakeholder_type']>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Stakeholder>>({});

  useEffect(() => {
    loadStakeholders();
  }, [projectId]);

  async function loadStakeholders() {
    try {
      const { data, error } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('project_id', projectId)
        .order('stakeholder_type', { ascending: true })
        .order('priority_rank', { ascending: true });

      if (error) throw error;
      setStakeholders(data || []);
    } catch (error) {
      console.error('Error loading stakeholders:', error);
    } finally {
      setLoading(false);
    }
  }

  function startAdd() {
    setIsAdding(true);
    setEditForm({
      project_id: projectId,
      stakeholder_type: 'creditor',
      name: '',
      alignment: 'unknown',
      influence_level: 'medium'
    });
  }

  function startEdit(stakeholder: Stakeholder) {
    setEditingId(stakeholder.id);
    setEditForm({ ...stakeholder });
  }

  function cancelEdit() {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({});
  }

  async function saveAdd() {
    if (!editForm.name) {
      alert('Please enter stakeholder name');
      return;
    }

    try {
      const { error } = await supabase
        .from('stakeholders')
        .insert({
          project_id: editForm.project_id,
          stakeholder_type: editForm.stakeholder_type,
          name: editForm.name,
          organization: editForm.organization,
          position_title: editForm.position_title,
          ownership_pct: editForm.ownership_pct,
          voting_power_pct: editForm.voting_power_pct,
          priority_rank: editForm.priority_rank,
          seniority_level: editForm.seniority_level,
          alignment: editForm.alignment,
          influence_level: editForm.influence_level,
          email: editForm.email,
          phone: editForm.phone,
          notes: editForm.notes
        });

      if (error) throw error;
      await loadStakeholders();
      cancelEdit();
    } catch (error) {
      console.error('Error adding stakeholder:', error);
      alert('Failed to add stakeholder. Please try again.');
    }
  }

  async function saveEdit() {
    if (!editingId || !editForm.name) {
      alert('Please enter stakeholder name');
      return;
    }

    try {
      const { error } = await supabase
        .from('stakeholders')
        .update({
          stakeholder_type: editForm.stakeholder_type,
          name: editForm.name,
          organization: editForm.organization,
          position_title: editForm.position_title,
          ownership_pct: editForm.ownership_pct,
          voting_power_pct: editForm.voting_power_pct,
          priority_rank: editForm.priority_rank,
          seniority_level: editForm.seniority_level,
          alignment: editForm.alignment,
          influence_level: editForm.influence_level,
          email: editForm.email,
          phone: editForm.phone,
          notes: editForm.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      await loadStakeholders();
      cancelEdit();
    } catch (error) {
      console.error('Error updating stakeholder:', error);
      alert('Failed to update stakeholder. Please try again.');
    }
  }

  async function deleteStakeholder(id: string) {
    if (!confirm('Are you sure you want to delete this stakeholder?')) return;

    try {
      const { error } = await supabase
        .from('stakeholders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadStakeholders();
    } catch (error) {
      console.error('Error deleting stakeholder:', error);
      alert('Failed to delete stakeholder. Please try again.');
    }
  }

  function getAlignmentColor(alignment: string) {
    switch (alignment) {
      case 'supportive':
        return 'bg-green-100 text-green-800';
      case 'neutral':
        return 'bg-gray-100 text-gray-800';
      case 'resistant':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  }

  function getInfluenceColor(influence: string) {
    switch (influence) {
      case 'high':
        return 'bg-purple-100 text-purple-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'creditor':
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'shareholder':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'board_member':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'management':
        return <User className="w-5 h-5 text-orange-600" />;
      case 'sponsor':
        return <Shield className="w-5 h-5 text-red-600" />;
      case 'advisor':
        return <User className="w-5 h-5 text-gray-600" />;
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  }

  const filteredStakeholders = filterType === 'all'
    ? stakeholders
    : stakeholders.filter(s => s.stakeholder_type === filterType);

  const creditorCount = stakeholders.filter(s => s.stakeholder_type === 'creditor').length;
  const shareholderCount = stakeholders.filter(s => s.stakeholder_type === 'shareholder').length;
  const boardCount = stakeholders.filter(s => s.stakeholder_type === 'board_member').length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Stakeholder Mapping</h3>
          </div>
          <button
            onClick={startAdd}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stakeholder</span>
          </button>
        </div>

        <div className="grid grid-cols-6 gap-3">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({stakeholders.length})
          </button>
          <button
            onClick={() => setFilterType('creditor')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'creditor' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Creditors ({creditorCount})
          </button>
          <button
            onClick={() => setFilterType('shareholder')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'shareholder' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Shareholders ({shareholderCount})
          </button>
          <button
            onClick={() => setFilterType('board_member')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'board_member' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Board ({boardCount})
          </button>
          <button
            onClick={() => setFilterType('management')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'management' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Management
          </button>
          <button
            onClick={() => setFilterType('sponsor')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'sponsor' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sponsors
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {isAdding && (
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">Add New Stakeholder</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Stakeholder Type *</label>
                <select
                  value={editForm.stakeholder_type || 'creditor'}
                  onChange={(e) => setEditForm({ ...editForm, stakeholder_type: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="creditor">Creditor</option>
                  <option value="shareholder">Shareholder</option>
                  <option value="board_member">Board Member</option>
                  <option value="management">Management</option>
                  <option value="sponsor">Sponsor</option>
                  <option value="advisor">Advisor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Organization</label>
                <input
                  type="text"
                  value={editForm.organization || ''}
                  onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="Company/Institution"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Position/Title</label>
                <input
                  type="text"
                  value={editForm.position_title || ''}
                  onChange={(e) => setEditForm({ ...editForm, position_title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="e.g., VP of Credit"
                />
              </div>
              {(editForm.stakeholder_type === 'creditor' || editForm.stakeholder_type === 'shareholder') && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ownership %</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editForm.ownership_pct ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, ownership_pct: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Voting Power %</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editForm.voting_power_pct ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, voting_power_pct: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
              {editForm.stakeholder_type === 'creditor' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Seniority Level</label>
                  <select
                    value={editForm.seniority_level || ''}
                    onChange={(e) => setEditForm({ ...editForm, seniority_level: e.target.value ? e.target.value as any : null })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">Not Specified</option>
                    <option value="senior-secured">Senior Secured</option>
                    <option value="senior-unsecured">Senior Unsecured</option>
                    <option value="subordinated">Subordinated</option>
                  </select>
                </div>
              )}
              {editForm.stakeholder_type === 'shareholder' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Equity Class</label>
                  <select
                    value={editForm.seniority_level || ''}
                    onChange={(e) => setEditForm({ ...editForm, seniority_level: e.target.value ? e.target.value as any : null })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">Not Specified</option>
                    <option value="equity-preferred">Preferred Equity</option>
                    <option value="equity-common">Common Equity</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Alignment</label>
                <select
                  value={editForm.alignment || 'unknown'}
                  onChange={(e) => setEditForm({ ...editForm, alignment: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="supportive">Supportive</option>
                  <option value="neutral">Neutral</option>
                  <option value="resistant">Resistant</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Influence Level</label>
                <select
                  value={editForm.influence_level || 'medium'}
                  onChange={(e) => setEditForm({ ...editForm, influence_level: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Additional context about this stakeholder"
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

        {filteredStakeholders.map((stakeholder) => {
          const isEditing = editingId === stakeholder.id;

          if (isEditing) {
            return (
              <div key={stakeholder.id} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-300">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Edit Stakeholder</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Organization</label>
                    <input
                      type="text"
                      value={editForm.organization || ''}
                      onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Position/Title</label>
                    <input
                      type="text"
                      value={editForm.position_title || ''}
                      onChange={(e) => setEditForm({ ...editForm, position_title: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  {(editForm.stakeholder_type === 'creditor' || editForm.stakeholder_type === 'shareholder') && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Ownership %</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={editForm.ownership_pct ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, ownership_pct: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Voting Power %</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={editForm.voting_power_pct ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, voting_power_pct: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Alignment</label>
                    <select
                      value={editForm.alignment || 'unknown'}
                      onChange={(e) => setEditForm({ ...editForm, alignment: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="supportive">Supportive</option>
                      <option value="neutral">Neutral</option>
                      <option value="resistant">Resistant</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Influence Level</label>
                    <select
                      value={editForm.influence_level || 'medium'}
                      onChange={(e) => setEditForm({ ...editForm, influence_level: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      rows={2}
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
            <div key={stakeholder.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  {getTypeIcon(stakeholder.stakeholder_type)}
                  <div>
                    <h4 className="font-semibold text-gray-900">{stakeholder.name}</h4>
                    <p className="text-sm text-gray-600">
                      {stakeholder.position_title && `${stakeholder.position_title} • `}
                      {stakeholder.organization || stakeholder.stakeholder_type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startEdit(stakeholder)}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteStakeholder(stakeholder.id)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-sm mb-3">
                {(stakeholder.ownership_pct !== null || stakeholder.voting_power_pct !== null) && (
                  <>
                    {stakeholder.ownership_pct !== null && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Ownership</p>
                        <p className="font-semibold text-gray-900">{stakeholder.ownership_pct.toFixed(2)}%</p>
                      </div>
                    )}
                    {stakeholder.voting_power_pct !== null && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Voting Power</p>
                        <p className="font-semibold text-gray-900">{stakeholder.voting_power_pct.toFixed(2)}%</p>
                      </div>
                    )}
                  </>
                )}
                {stakeholder.seniority_level && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">
                      {stakeholder.stakeholder_type === 'creditor' ? 'Seniority' : 'Class'}
                    </p>
                    <p className="text-sm font-medium text-gray-700">
                      {stakeholder.seniority_level.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-600 mb-1">Alignment</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${getAlignmentColor(stakeholder.alignment)}`}>
                    {stakeholder.alignment}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Influence</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${getInfluenceColor(stakeholder.influence_level)}`}>
                    {stakeholder.influence_level}
                  </span>
                </div>
              </div>

              {(stakeholder.email || stakeholder.phone) && (
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                  {stakeholder.email && <span>{stakeholder.email}</span>}
                  {stakeholder.phone && <span>{stakeholder.phone}</span>}
                </div>
              )}

              {stakeholder.notes && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600">Notes:</p>
                  <p className="text-sm text-gray-700 mt-1">{stakeholder.notes}</p>
                </div>
              )}
            </div>
          );
        })}

        {filteredStakeholders.length === 0 && !isAdding && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {filterType === 'all'
                ? 'No stakeholders mapped. Click "Add Stakeholder" to start.'
                : `No ${filterType.replace('_', ' ')}s mapped.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
