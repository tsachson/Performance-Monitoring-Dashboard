import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Project } from '../types/database';
import { X, Save } from 'lucide-react';
import { recalculateDSCR } from '../lib/dscrCalculation';

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditProjectModal({ project, onClose, onUpdate }: EditProjectModalProps) {
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditedProject({ ...project });
  }, [project]);

  function updateField(field: string, value: any) {
    setEditedProject({ ...editedProject, [field]: value });
  }

  async function handleSave() {
    if (editedProject.current_status === 'closed' && !editedProject.closure_type) {
      alert('Please specify how this project was closed (closure type) before marking it as Closed.');
      return;
    }

    setSaving(true);
    try {
      const interestRateChanged =
        editedProject.interest_rate !== undefined &&
        editedProject.interest_rate !== project.interest_rate;

      const { error } = await supabase
        .from('projects')
        .update({
          project_name: editedProject.project_name,
          deal_size: editedProject.deal_size,
          interest_rate: editedProject.interest_rate,
          dividend_rate: editedProject.dividend_rate,
          rating: editedProject.rating,
          current_status: editedProject.current_status,
          closure_type: editedProject.current_status === 'closed' ? editedProject.closure_type : null,
          warrant_details: editedProject.warrant_details,
          conversion_details: editedProject.conversion_details,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;

      if (interestRateChanged && editedProject.interest_rate !== null && editedProject.interest_rate !== undefined) {
        await recalculateDSCR(project.id, editedProject.interest_rate);
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Project Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
              <input
                type="text"
                value={editedProject.project_name || ''}
                onChange={(e) => updateField('project_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deal Size *</label>
                <input
                  type="number"
                  value={editedProject.deal_size || 0}
                  onChange={(e) => updateField('deal_size', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editedProject.current_status || 'performing'}
                  onChange={(e) => updateField('current_status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="performing">Performing</option>
                  <option value="watch-list">Watchlist</option>
                  <option value="remediation-required">Remediation Required</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {editedProject.current_status === 'closed' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  How was this project closed? *
                </label>
                <select
                  value={editedProject.closure_type || ''}
                  onChange={(e) => updateField('closure_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select closure type...</option>
                  <option value="fully-satisfied">Fully Satisfied (Maturity or Early Redemption)</option>
                  <option value="with-restructuring">Closed with Restructuring</option>
                  <option value="partial-loss">Closed with Partial Loss</option>
                  <option value="complete-loss">Written Off (Complete Loss)</option>
                </select>
                <p className="text-xs text-gray-600 mt-2">
                  Required to mark project as Closed. This indicates how the project left the bank's books.
                </p>
              </div>
            )}

            {(project.instrument_type.includes('Debt') ||
              project.instrument_type.includes('Bonds') ||
              project.instrument_type.includes('Loan')) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedProject.interest_rate || 0}
                    onChange={(e) => updateField('interest_rate', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                  <input
                    type="text"
                    value={editedProject.rating || ''}
                    onChange={(e) => updateField('rating', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., BBB+"
                  />
                </div>
              </div>
            )}

            {project.instrument_type.includes('Equity') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dividend Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editedProject.dividend_rate || 0}
                  onChange={(e) => updateField('dividend_rate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {project.has_warrants && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warrant Details</label>
                <textarea
                  value={editedProject.warrant_details || ''}
                  onChange={(e) => updateField('warrant_details', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {project.has_conversion && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conversion Details</label>
                <textarea
                  value={editedProject.conversion_details || ''}
                  onChange={(e) => updateField('conversion_details', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
