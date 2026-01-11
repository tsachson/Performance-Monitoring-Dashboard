import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ProjectWithIssuer, ProjectStatusHistory } from '../types/database';
import { Search, FileSearch, CheckCircle, Hammer, TrendingDown, CircleSlash, ExternalLink, Filter } from 'lucide-react';

interface PrecedentProject extends ProjectWithIssuer {
  history?: ProjectStatusHistory[];
}

interface PrecedentsSearchProps {
  onSelectProject: (projectId: string) => void;
}

export function PrecedentsSearch({ onSelectProject }: PrecedentsSearchProps) {
  const [precedents, setPrecedents] = useState<PrecedentProject[]>([]);
  const [filteredPrecedents, setFilteredPrecedents] = useState<PrecedentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [closureFilter, setClosureFilter] = useState<string>('all');

  useEffect(() => {
    loadPrecedents();
  }, []);

  useEffect(() => {
    filterPrecedents();
  }, [precedents, searchTerm, instrumentFilter, sectorFilter, countryFilter, closureFilter]);

  async function loadPrecedents() {
    try {
      const { data: allProjects, error } = await supabase
        .from('projects')
        .select(`
          *,
          issuer:issuers(*),
          history:project_status_history(*)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projectsWithHistory = (allProjects as any[])
        .map(p => ({
          ...p,
          history: p.history || []
        }))
        .filter(p => p.current_status === 'closed');

      setPrecedents(projectsWithHistory);
    } catch (error) {
      console.error('Error loading precedents:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterPrecedents() {
    let filtered = [...precedents];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.project_name.toLowerCase().includes(term) ||
        p.unique_project_id.toLowerCase().includes(term) ||
        p.issuer?.name.toLowerCase().includes(term) ||
        p.issuer?.industry_sector.toLowerCase().includes(term) ||
        p.country.toLowerCase().includes(term)
      );
    }

    if (instrumentFilter !== 'all') {
      if (instrumentFilter === 'debt') {
        filtered = filtered.filter(p =>
          p.instrument_type.includes('Debt') ||
          p.instrument_type === 'Project Bonds' ||
          p.instrument_type === 'Convertible Bonds'
        );
      } else if (instrumentFilter === 'equity') {
        filtered = filtered.filter(p =>
          p.instrument_type.includes('Equity') ||
          p.instrument_type === 'Mezzanine Finance'
        );
      } else {
        filtered = filtered.filter(p => p.instrument_type === instrumentFilter);
      }
    }

    if (sectorFilter !== 'all') {
      filtered = filtered.filter(p => p.issuer?.industry_sector === sectorFilter);
    }

    if (countryFilter !== 'all') {
      filtered = filtered.filter(p => p.country === countryFilter);
    }

    if (closureFilter !== 'all') {
      filtered = filtered.filter(p => p.closure_type === closureFilter);
    }

    setFilteredPrecedents(filtered);
  }

  const sectors = Array.from(new Set(precedents.map(p => p.issuer?.industry_sector).filter(Boolean))).sort();
  const countries = Array.from(new Set(precedents.map(p => p.country))).sort();
  const instruments = Array.from(new Set(precedents.map(p => p.instrument_type))).sort();

  const getClosureIcon = (closureType: string | null) => {
    switch (closureType) {
      case 'fully-satisfied':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'with-restructuring':
        return <Hammer className="w-5 h-5 text-blue-600" />;
      case 'partial-loss':
        return <TrendingDown className="w-5 h-5 text-yellow-600" />;
      case 'complete-loss':
        return <CircleSlash className="w-5 h-5 text-red-600" />;
      default:
        return <FileSearch className="w-5 h-5 text-gray-400" />;
    }
  };

  const getClosureColor = (closureType: string | null) => {
    switch (closureType) {
      case 'fully-satisfied':
        return 'bg-green-50 border-green-200';
      case 'with-restructuring':
        return 'bg-blue-50 border-blue-200';
      case 'partial-loss':
        return 'bg-yellow-50 border-yellow-200';
      case 'complete-loss':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getClosureBadge = (closureType: string | null) => {
    switch (closureType) {
      case 'fully-satisfied':
        return 'bg-green-100 text-green-800';
      case 'with-restructuring':
        return 'bg-blue-100 text-blue-800';
      case 'partial-loss':
        return 'bg-yellow-100 text-yellow-800';
      case 'complete-loss':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const successCount = filteredPrecedents.filter(p => p.closure_type === 'fully-satisfied' || p.closure_type === 'with-restructuring').length;
  const recoveryRate = filteredPrecedents.length > 0 ? (successCount / filteredPrecedents.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Precedents Database</h1>
        <p className="mt-1 text-sm text-gray-600">Search closed cases for successful resolution strategies and lessons learned</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex flex-col">
          <p className="text-sm font-medium text-gray-600 mb-4">Total Precedents</p>
          <div className="flex items-end justify-between mt-auto">
            <p className="text-2xl font-bold text-gray-900">{filteredPrecedents.length}</p>
            <FileSearch className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex flex-col">
          <p className="text-sm font-medium text-gray-600 mb-4">Fully Satisfied</p>
          <div className="flex items-end justify-between mt-auto">
            <p className="text-2xl font-bold text-green-600">
              {filteredPrecedents.filter(p => p.closure_type === 'fully-satisfied').length}
            </p>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex flex-col">
          <p className="text-sm font-medium text-gray-600 mb-4">With Restructuring</p>
          <div className="flex items-end justify-between mt-auto">
            <p className="text-2xl font-bold text-blue-600">
              {filteredPrecedents.filter(p => p.closure_type === 'with-restructuring').length}
            </p>
            <Hammer className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex flex-col">
          <p className="text-sm font-medium text-gray-600 mb-4">Partial Loss</p>
          <div className="flex items-end justify-between mt-auto">
            <p className="text-2xl font-bold text-yellow-600">
              {filteredPrecedents.filter(p => p.closure_type === 'partial-loss').length}
            </p>
            <TrendingDown className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex flex-col">
          <p className="text-sm font-medium text-gray-600 mb-4">Complete Loss</p>
          <div className="flex items-end justify-between mt-auto">
            <p className="text-2xl font-bold text-red-600">
              {filteredPrecedents.filter(p => p.closure_type === 'complete-loss').length}
            </p>
            <CircleSlash className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Search & Filter</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by project, issuer, sector, country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <select
              value={instrumentFilter}
              onChange={(e) => setInstrumentFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Instruments</option>
              <option value="debt">All Debt</option>
              <option value="equity">All Equity</option>
              {instruments.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sectors</option>
              {sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={closureFilter}
              onChange={(e) => setClosureFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Outcomes</option>
              <option value="fully-satisfied">Fully Satisfied</option>
              <option value="with-restructuring">With Restructuring</option>
              <option value="partial-loss">Partial Loss</option>
              <option value="complete-loss">Complete Loss</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredPrecedents.length} of {precedents.length} closed cases
        </div>
      </div>

      <div className="space-y-4">
        {filteredPrecedents.map((project) => (
          <div
            key={project.id}
            className={`bg-white rounded-lg shadow border-2 p-6 ${getClosureColor(project.closure_type)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3">
                {getClosureIcon(project.closure_type)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{project.project_name}</h3>
                  <p className="text-sm text-gray-600">{project.unique_project_id} • {project.issuer?.name}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getClosureBadge(project.closure_type)}`}>
                      {project.closure_type?.replace('-', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-600">•</span>
                    <span className="text-xs text-gray-600">{project.instrument_type}</span>
                    <span className="text-xs text-gray-600">•</span>
                    <span className="text-xs text-gray-600">{project.issuer?.industry_sector}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
              <div>
                <p className="text-xs text-gray-600">Deal Size</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(project.deal_size, project.issuance_currency)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Country</p>
                <p className="text-sm font-bold text-gray-900">{project.country}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Issuance Date</p>
                <p className="text-sm font-bold text-gray-900">{formatDate(project.issuance_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Closed Date</p>
                <p className="text-sm font-bold text-gray-900">{formatDate(project.updated_at)}</p>
              </div>
            </div>

            {project.history && project.history.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Case Timeline</h4>
                <div className="space-y-2">
                  {project.history
                    .sort((a, b) => new Date(a.status_date).getTime() - new Date(b.status_date).getTime())
                    .map((event, index) => (
                      <div key={event.id} className="flex items-start space-x-3 text-sm">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full ${
                            index === project.history!.length - 1 ? 'bg-blue-600' : 'bg-gray-400'
                          }`}></div>
                          {index < project.history!.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-300 my-1"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{event.status}</span>
                            {event.sub_status && (
                              <span className="text-gray-600">• {event.sub_status}</span>
                            )}
                            <span className="text-gray-500">• {formatDate(event.status_date)}</span>
                          </div>
                          {event.notes && (
                            <p className="text-gray-700 mt-1 text-sm">{event.notes}</p>
                          )}
                          {event.changed_by && (
                            <p className="text-gray-500 text-xs mt-1">By: {event.changed_by}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="bg-blue-50 rounded-lg p-4 flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Key Lessons</h4>
                <p className="text-sm text-blue-800">
                  {project.closure_type === 'fully-satisfied' && (
                    "Successfully closed per original terms. Strong operational performance and sponsor commitment were key factors."
                  )}
                  {project.closure_type === 'with-restructuring' && (
                    "Achieved successful resolution through proactive restructuring. Early intervention and collaborative stakeholder engagement enabled value preservation."
                  )}
                  {project.closure_type === 'partial-loss' && (
                    "Partial recovery achieved through workout process. Secured senior position and active remediation mitigated losses."
                  )}
                  {project.closure_type === 'complete-loss' && (
                    "Full writedown required. Case study for enhanced due diligence and earlier intervention triggers."
                  )}
                </p>
              </div>
              <button
                onClick={() => onSelectProject(project.id)}
                className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center whitespace-nowrap"
              >
                View Details
                <ExternalLink className="ml-1 w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredPrecedents.length === 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <FileSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No precedents found matching your search criteria</p>
          <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
}
