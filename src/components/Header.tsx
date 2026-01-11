import { Globe } from 'lucide-react';

interface HeaderProps {
  onNavigate: (view: string) => void;
  currentView: string;
}

export default function Header({ onNavigate, currentView }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <div className="relative">
              <Globe className="w-10 h-10 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <div className="absolute inset-0 bg-blue-400 opacity-20 blur-xl group-hover:opacity-30 transition-opacity rounded-full"></div>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Performance Monitoring Dashboard
              </span>
              <span className="text-xs text-slate-400">Investment Portfolio Tracking</span>
            </div>
          </button>

          <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border-2 border-blue-500 shadow-lg shadow-blue-500/20">
            <div className="flex items-center gap-1 text-sm text-slate-300 mr-2">
              <span className="font-semibold">Navigation:</span>
            </div>
            <select
              value={currentView}
              onChange={(e) => onNavigate(e.target.value)}
              className="bg-slate-700 text-white px-4 py-2 rounded-md border border-slate-600 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium transition-all"
            >
              <option value="dashboard">Portfolio Overview</option>
              <option value="alerts">Alerts & Reminders</option>
              <option value="performing">Performing Projects</option>
              <option value="watchlist">Watchlist Monitoring</option>
              <option value="remediation">Remediation Management</option>
              <option value="precedents">Precedents Search</option>
              <option value="projects">Investment Projects</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
