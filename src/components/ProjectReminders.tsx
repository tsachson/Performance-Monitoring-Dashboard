import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Save, X, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProjectReminder } from '../types/database';

interface ProjectRemindersProps {
  projectId: string;
}

export default function ProjectReminders({ projectId }: ProjectRemindersProps) {
  const [reminders, setReminders] = useState<ProjectReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    fetchReminders();
  }, [projectId]);

  const fetchReminders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_reminders')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('reminder_date', { ascending: true });

    if (error) {
      console.error('Error fetching reminders:', error);
    } else {
      setReminders(data || []);
    }
    setLoading(false);
  };

  const addReminder = async () => {
    if (!newDate || !newDescription.trim()) return;

    const { data: reminder, error: reminderError } = await supabase
      .from('project_reminders')
      .insert({
        project_id: projectId,
        reminder_date: newDate,
        description: newDescription,
        created_by: 'user',
      })
      .select()
      .single();

    if (reminderError) {
      console.error('Error adding reminder:', reminderError);
      return;
    }

    const { error: alertError } = await supabase
      .from('project_alerts')
      .insert({
        project_id: projectId,
        alert_date: newDate,
        description: newDescription,
        created_from_reminder_id: reminder.id,
      });

    if (alertError) {
      console.error('Error creating alert:', alertError);
    }

    setNewDate('');
    setNewDescription('');
    setIsAdding(false);
    fetchReminders();
  };

  const updateReminder = async (id: string) => {
    if (!editDate || !editDescription.trim()) return;

    const { error: updateError } = await supabase
      .from('project_reminders')
      .update({
        reminder_date: editDate,
        description: editDescription,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating reminder:', updateError);
      return;
    }

    const { error: alertError } = await supabase
      .from('project_alerts')
      .update({
        alert_date: editDate,
        description: editDescription,
      })
      .eq('created_from_reminder_id', id);

    if (alertError) {
      console.error('Error updating alert:', alertError);
    }

    setEditingId(null);
    setEditDate('');
    setEditDescription('');
    fetchReminders();
  };

  const deleteReminder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;

    const { error } = await supabase
      .from('project_reminders')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting reminder:', error);
    } else {
      fetchReminders();
    }
  };

  const startEdit = (reminder: ProjectReminder) => {
    setEditingId(reminder.id);
    setEditDate(reminder.reminder_date);
    setEditDescription(reminder.description);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDate('');
    setEditDescription('');
  };

  const isOverdue = (date: string) => {
    return new Date(date) < new Date(new Date().toISOString().split('T')[0]);
  };

  const isToday = (date: string) => {
    return date === new Date().toISOString().split('T')[0];
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading reminders...</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Reminders & Alerts</h3>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Reminder
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What should we remind you about?"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={addReminder}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewDate('');
                setNewDescription('');
              }}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {reminders.map((reminder) => {
          const overdue = isOverdue(reminder.reminder_date);
          const today = isToday(reminder.reminder_date);

          return (
            <div
              key={reminder.id}
              className={`p-4 rounded-lg border transition-colors ${
                overdue
                  ? 'bg-red-50 border-red-200'
                  : today
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bell className={`w-4 h-4 ${overdue ? 'text-red-600' : today ? 'text-orange-600' : 'text-blue-600'}`} />
                  <div className="text-sm font-medium">
                    <span className={overdue ? 'text-red-700' : today ? 'text-orange-700' : 'text-gray-700'}>
                      {new Date(reminder.reminder_date).toLocaleDateString()}
                    </span>
                    {today && <span className="ml-2 text-xs font-semibold text-orange-600">TODAY</span>}
                    {overdue && <span className="ml-2 text-xs font-semibold text-red-600">OVERDUE</span>}
                  </div>
                </div>
                {editingId !== reminder.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(reminder)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteReminder(reminder.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {editingId === reminder.id ? (
                <div className="space-y-3">
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateReminder(reminder.id)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-700">{reminder.description}</div>
              )}
            </div>
          );
        })}

        {reminders.length === 0 && !isAdding && (
          <div className="text-center py-8 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No reminders set. Click "Add Reminder" to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
