import { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProjectDiary } from '../types/database';

interface ProjectDiaryProps {
  projectId: string;
}

export default function ProjectDiaryComponent({ projectId }: ProjectDiaryProps) {
  const [entries, setEntries] = useState<ProjectDiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchEntries();
  }, [projectId]);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_diaries')
      .select('*')
      .eq('project_id', projectId)
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error fetching diary entries:', error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const addEntry = async () => {
    const trimmedContent = newContent.trim();
    if (!trimmedContent) {
      alert('Please enter some content for the diary entry');
      return;
    }

    const { error } = await supabase
      .from('project_diaries')
      .insert({
        project_id: projectId,
        entry_text: trimmedContent,
        created_by: 'user',
      });

    if (error) {
      console.error('Error adding diary entry:', error);
      alert('Failed to save diary entry. Please try again.');
    } else {
      setNewContent('');
      setIsAdding(false);
      fetchEntries();
    }
  };

  const updateEntry = async (id: string) => {
    const trimmedContent = editContent.trim();
    if (!trimmedContent) {
      alert('Please enter some content for the diary entry');
      return;
    }

    const { error } = await supabase
      .from('project_diaries')
      .update({
        entry_text: trimmedContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating diary entry:', error);
      alert('Failed to update diary entry. Please try again.');
    } else {
      setEditingId(null);
      setEditContent('');
      fetchEntries();
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this diary entry?')) return;

    const { error } = await supabase
      .from('project_diaries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting diary entry:', error);
    } else {
      fetchEntries();
    }
  };

  const startEdit = (entry: ProjectDiary) => {
    setEditingId(entry.id);
    setEditContent(entry.entry_text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading diary...</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Project Diary</h3>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write your diary entry..."
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={addEntry}
              disabled={!newContent.trim()}
              className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors ${
                newContent.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewContent('');
              }}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-xs text-gray-500">
                {new Date(entry.entry_date).toLocaleString()} by {entry.created_by}
              </div>
              {editingId !== entry.id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(entry)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {editingId === entry.id ? (
              <div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => updateEntry(entry.id)}
                    disabled={!editContent.trim()}
                    className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors ${
                      editContent.trim()
                        ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{entry.entry_text}</div>
            )}
          </div>
        ))}

        {entries.length === 0 && !isAdding && (
          <div className="text-center py-8 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No diary entries yet. Click "Add Entry" to start.</p>
          </div>
        )}
      </div>
    </div>
  );
}
