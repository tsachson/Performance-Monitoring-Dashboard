import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SupportNetworkContact } from '../types/database';
import { X, Plus, Trash2, Save } from 'lucide-react';

interface EditContactModalProps {
  projectId: string;
  contacts: SupportNetworkContact[];
  onClose: () => void;
  onUpdate: () => void;
}

const TEAM_TYPES = ['Sector', 'Country', 'Credit', 'Finance', 'Treasury', 'Communications', 'Policy', 'Legal', 'Remediation', 'IT'] as const;

export function EditContactModal({ projectId, contacts, onClose, onUpdate }: EditContactModalProps) {
  const [editedContacts, setEditedContacts] = useState<Partial<SupportNetworkContact>[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditedContacts(contacts.length > 0 ? [...contacts] : [createEmptyContact()]);
  }, [contacts]);

  function createEmptyContact(): Partial<SupportNetworkContact> {
    return {
      project_id: projectId,
      team_type: 'Sector',
      contact_name: '',
      contact_title: '',
      contact_phone: '',
      contact_email: '',
      is_primary: false,
      notes: ''
    };
  }

  function addContact() {
    setEditedContacts([...editedContacts, createEmptyContact()]);
  }

  function removeContact(index: number) {
    const newContacts = editedContacts.filter((_, i) => i !== index);
    setEditedContacts(newContacts);
  }

  function updateContact(index: number, field: string, value: any) {
    const newContacts = [...editedContacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setEditedContacts(newContacts);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await supabase.from('support_network_contacts').delete().eq('project_id', projectId);

      const contactsToInsert = editedContacts.filter(c => c.contact_name && c.contact_name.trim() !== '');

      if (contactsToInsert.length > 0) {
        const { error } = await supabase
          .from('support_network_contacts')
          .insert(contactsToInsert as SupportNetworkContact[]);

        if (error) throw error;
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving contacts:', error);
      alert('Failed to save contacts. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Support Network Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {editedContacts.map((contact, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Contact {index + 1}</h3>
                  {editedContacts.length > 1 && (
                    <button
                      onClick={() => removeContact(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team Type</label>
                    <select
                      value={contact.team_type || 'Sector'}
                      onChange={(e) => updateContact(index, 'team_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {TEAM_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={contact.contact_name || ''}
                      onChange={(e) => updateContact(index, 'contact_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={contact.contact_title || ''}
                      onChange={(e) => updateContact(index, 'contact_title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Job title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={contact.contact_email || ''}
                      onChange={(e) => updateContact(index, 'contact_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={contact.contact_phone || ''}
                      onChange={(e) => updateContact(index, 'contact_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1234567890"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`primary-${index}`}
                      checked={contact.is_primary || false}
                      onChange={(e) => updateContact(index, 'is_primary', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <label htmlFor={`primary-${index}`} className="ml-2 text-sm text-gray-700">
                      Primary Contact
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={contact.notes || ''}
                    onChange={(e) => updateContact(index, 'notes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addContact}
            className="mt-4 flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Another Contact</span>
          </button>
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
