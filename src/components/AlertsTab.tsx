import { useState, useEffect } from 'react';
import { Bell, BellOff, ArrowUpDown, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProjectAlert, Project } from '../types/database';

interface AlertWithProject extends ProjectAlert {
  project: Project;
}

type SortField = 'alert_date' | 'project_name';
type SortDirection = 'asc' | 'desc';

export default function AlertsTab() {
  const [alerts, setAlerts] = useState<AlertWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRead, setShowRead] = useState(false);
  const [sortField, setSortField] = useState<SortField>('alert_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchAlerts();
  }, [showRead]);

  const fetchAlerts = async () => {
    setLoading(true);
    let query = supabase
      .from('project_alerts')
      .select(`
        *,
        project:projects(*)
      `);

    if (!showRead) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query.order('alert_date', { ascending: true });

    if (error) {
      console.error('Error fetching alerts:', error);
    } else {
      setAlerts(data || []);
    }
    setLoading(false);
  };

  const markAsRead = async (alertId: string) => {
    const { error } = await supabase
      .from('project_alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    if (error) {
      console.error('Error marking alert as read:', error);
    } else {
      fetchAlerts();
    }
  };

  const markAsUnread = async (alertId: string) => {
    const { error } = await supabase
      .from('project_alerts')
      .update({ is_read: false })
      .eq('id', alertId);

    if (error) {
      console.error('Error marking alert as unread:', error);
    } else {
      fetchAlerts();
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAlerts = [...alerts].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortField) {
      case 'alert_date':
        aVal = new Date(a.alert_date).getTime();
        bVal = new Date(b.alert_date).getTime();
        break;
      case 'project_name':
        aVal = a.project?.project_name || '';
        bVal = b.project?.project_name || '';
        break;
      default:
        return 0;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const unreadCount = alerts.filter(a => !a.is_read).length;
  const today = new Date().toISOString().split('T')[0];
  const upcomingAlerts = alerts.filter(a => !a.is_read && a.alert_date >= today);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
    >
      {label}
      <ArrowUpDown className={`w-4 h-4 ${sortField === field ? 'text-blue-600' : 'text-gray-400'}`} />
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Alerts & Reminders</h2>
              <p className="text-gray-600">Stay on top of important dates and actions</p>
            </div>
          </div>
          <button
            onClick={() => setShowRead(!showRead)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {showRead ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            {showRead ? 'Hide Read' : 'Show All'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <div className="text-2xl font-bold text-blue-700">{unreadCount}</div>
            </div>
            <div className="text-sm font-semibold text-blue-600">Unread Alerts</div>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <div className="text-2xl font-bold text-orange-700">{upcomingAlerts.length}</div>
            </div>
            <div className="text-sm font-semibold text-orange-600">Upcoming/Today</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <SortButton field="alert_date" label="Date" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <SortButton field="project_name" label="Project" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAlerts.map((alert) => {
                const isToday = alert.alert_date === today;
                const isPast = alert.alert_date < today;
                return (
                  <tr
                    key={alert.id}
                    className={`hover:bg-gray-50 ${
                      !alert.is_read ? 'bg-blue-50' : ''
                    } ${isToday ? 'border-l-4 border-orange-500' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {alert.is_read ? (
                        <BellOff className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Bell className="w-5 h-5 text-blue-600" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col">
                        <span className={`font-medium ${isPast ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-gray-900'}`}>
                          {new Date(alert.alert_date).toLocaleDateString()}
                        </span>
                        {isToday && <span className="text-xs text-orange-600 font-semibold">TODAY</span>}
                        {isPast && !alert.is_read && <span className="text-xs text-red-600 font-semibold">OVERDUE</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {alert.project?.project_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {alert.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {alert.is_read ? (
                        <button
                          onClick={() => markAsUnread(alert.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Mark Unread
                        </button>
                      ) : (
                        <button
                          onClick={() => markAsRead(alert.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Mark Read
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {alerts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No alerts found.</p>
            {!showRead && <p className="text-sm mt-2">Click "Show All" to see read alerts.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
