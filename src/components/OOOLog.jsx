import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, Loader2, Edit3, X, Calendar, AlertCircle, UserMinus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  getStoredToken,
  loadGoogleScript,
  authenticateWithGoogle,
  fetchOOOLogData,
  appendOOOEntry,
  updateOOOEntry,
  deleteOOOEntry,
} from '../utils/googleSheets';

export default function OOOLog() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({ title: '', date: '', endDate: '' });
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let token = getStoredToken();
      if (!token) {
        if (clientId) {
          await loadGoogleScript();
          token = await authenticateWithGoogle(clientId);
        } else {
          throw new Error('Google Client ID not configured');
        }
      }
      const data = await fetchOOOLogData(token);
      setEntries(data);
    } catch (err) {
      console.error('Error fetching OOO Log:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;
    setIsSaving(true);
    setError(null);
    try {
      const token = getStoredToken();
      if (!token) throw new Error('Not authenticated. Please refresh and sign in.');
      await appendOOOEntry(token, formData);
      setFormData({ title: '', date: '', endDate: '' });
      await fetchEntries();
    } catch (err) {
      console.error('Error adding OOO entry:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingEntry || !editingEntry.title.trim() || !editingEntry.date) return;
    setIsSaving(true);
    setError(null);
    try {
      const token = getStoredToken();
      if (!token) throw new Error('Not authenticated. Please refresh and sign in.');
      await updateOOOEntry(token, editingEntry.rowIndex, editingEntry);
      setShowEditModal(false);
      setEditingEntry(null);
      await fetchEntries();
    } catch (err) {
      console.error('Error updating OOO entry:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete "${entry.title}"?`)) return;
    setIsSaving(true);
    setError(null);
    try {
      const token = getStoredToken();
      if (!token) throw new Error('Not authenticated. Please refresh and sign in.');
      await deleteOOOEntry(token, entry.rowIndex);
      await fetchEntries();
    } catch (err) {
      console.error('Error deleting OOO entry:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try { return format(parseISO(dateStr), 'MMM d, yyyy'); } catch { return dateStr; }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserMinus size={28} className="text-ls-orange" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OOO Log</h1>
            <p className="text-sm text-gray-500">Team out-of-office dates — shared across everyone via Google Sheets</p>
          </div>
        </div>
        <button
          onClick={fetchEntries}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Add Form */}
      <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add OOO Entry</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Name / Description</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ls-orange focus:border-transparent"
              placeholder="e.g., Sarah - Vacation"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ls-orange focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date (optional)</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ls-orange focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={!formData.title.trim() || !formData.date || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-ls-orange text-white rounded-lg hover:bg-ls-orange-bright disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add
          </button>
        </form>
      </div>

      {/* Entries Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            Loading OOO Log...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <UserMinus size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No OOO entries yet</p>
            <p className="text-sm">Add team out-of-office dates above. They'll appear on the calendar for everyone.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name / Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Start Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">End Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{entry.title}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3 text-gray-600">{entry.endDate ? formatDate(entry.endDate) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditingEntry({ ...entry }); setShowEditModal(true); }}
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
                        title="Edit"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry)}
                        disabled={isSaving}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-gray-500 hover:text-red-600 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Edit OOO Entry</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name / Description</label>
                <input
                  type="text"
                  value={editingEntry.title}
                  onChange={e => setEditingEntry(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={editingEntry.date}
                  onChange={e => setEditingEntry(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                <input
                  type="date"
                  value={editingEntry.endDate || ''}
                  onChange={e => setEditingEntry(p => ({ ...p, endDate: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={handleUpdate}
                disabled={!editingEntry.title.trim() || !editingEntry.date || isSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-ls-orange text-white rounded-lg hover:bg-ls-orange-bright disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                Update OOO Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
