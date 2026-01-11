import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ProjectWithIssuer, WatchlistMetrics } from '../types/database';
import { calculateProjectStatus, ProjectStatus } from '../lib/projectStatus';
import { Search, Filter, ArrowUpDown, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProjectWithCalculatedStatus extends ProjectWithIssuer {
  calculatedStatus: ProjectStatus;
}

interface ProjectsListProps {
  onSelectProject: (projectId: string) => void;
}

export function ProjectsList({ onSelectProject }: ProjectsListProps) {
  const [projects, setProjects] = useState<ProjectWithCalculatedStatus[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithCalculatedStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [sortField, setSortField] = useState<'project_name' | 'issuer' | 'instrument_type' | 'deal_size' | 'country' | 'calculatedStatus'>('project_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterAndSortProjects();
  }, [projects, searchTerm, statusFilter, countryFilter, sortBy, sortField, sortDirection]);

  useEffect(() => {
    checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [filteredProjects]);

  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 300;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  async function loadProjects() {
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
          *,
          issuer:issuers(*)
        `)
        .order('project_name');

      if (error) throw error;

      const { data: metricsData } = await supabase
        .from('watchlist_metrics')
        .select('*');

      const metricsMap = new Map<string, WatchlistMetrics>();
      (metricsData || []).forEach(m => metricsMap.set(m.project_id, m));

      const projectsWithStatus = (projectsData as ProjectWithIssuer[]).map(p => ({
        ...p,
        calculatedStatus: calculateProjectStatus(p, metricsMap.get(p.id))
      }));

      setProjects(projectsWithStatus);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterAndSortProjects() {
    let filtered = [...projects];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.project_name.toLowerCase().includes(term) ||
        p.unique_project_id.toLowerCase().includes(term) ||
        p.issuer?.name.toLowerCase().includes(term) ||
        p.country.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.calculatedStatus === statusFilter);
    }

    if (countryFilter !== 'all') {
      filtered = filtered.filter(p => p.country === countryFilter);
    }

    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'project_name':
          aVal = a.project_name;
          bVal = b.project_name;
          break;
        case 'issuer':
          aVal = a.issuer?.name || '';
          bVal = b.issuer?.name || '';
          break;
        case 'instrument_type':
          aVal = a.instrument_type;
          bVal = b.instrument_type;
          break;
        case 'deal_size':
          aVal = a.deal_size;
          bVal = b.deal_size;
          break;
        case 'country':
          aVal = a.country;
          bVal = b.country;
          break;
        case 'calculatedStatus':
          aVal = a.calculatedStatus;
          bVal = b.calculatedStatus;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredProjects(filtered);
  }

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const countries = Array.from(new Set(projects.map(p => p.country))).sort();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'performing': return 'bg-green-100 text-green-800';
      case 'watch-list': return 'bg-yellow-100 text-yellow-800';
      case 'remediation-required': return 'bg-red-100 text-red-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Investment Projects</h1>
        <p className="mt-1 text-sm text-gray-600">Browse and manage all investment transactions</p>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search projects, issuers, or IDs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="performing">Performing</option>
              <option value="watch-list">Watchlist</option>
              <option value="remediation-required">Remediation</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Countries</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {filteredProjects.length} of {projects.length} projects
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1 text-sm rounded ${sortBy === 'name' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Name
            </button>
            <button
              onClick={() => setSortBy('size')}
              className={`px-3 py-1 text-sm rounded ${sortBy === 'size' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Size
            </button>
            <button
              onClick={() => setSortBy('date')}
              className={`px-3 py-1 text-sm rounded ${sortBy === 'date' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Date
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="relative">
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10 flex items-center justify-end pr-2">
              <div className="bg-blue-600 text-white rounded-full p-1 animate-pulse pointer-events-auto">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="text-sm text-gray-600">
              {canScrollRight && (
                <span className="font-medium text-blue-600">← Scroll right to see Actions column →</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className={`p-2 rounded-lg border transition-colors ${
                  canScrollLeft
                    ? 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
                title="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className={`p-2 rounded-lg border transition-colors ${
                  canScrollRight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
                title="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            onScroll={checkScrollButtons}
            className="overflow-x-auto"
          >
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('project_name')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    Project
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'project_name' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('issuer')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    Issuer
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'issuer' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('instrument_type')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    Instrument
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'instrument_type' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('deal_size')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    Deal Size
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'deal_size' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('country')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    Country
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'country' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('calculatedStatus')}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                  >
                    Status
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'calculatedStatus' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{project.project_name}</div>
                      <div className="text-sm text-gray-500">{project.unique_project_id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{project.issuer?.name}</div>
                    <div className="text-sm text-gray-500">{project.issuer?.industry_sector}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{project.instrument_type}</div>
                    {project.rating && (
                      <div className="text-sm text-gray-500">Rating: {project.rating}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(project.deal_size, project.issuance_currency)}
                    </div>
                    <div className="text-sm text-gray-500">{project.issuance_currency}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.country}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(project.calculatedStatus)}`}>
                      {project.calculatedStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onSelectProject(project.id)}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                    >
                      View Details
                      <ExternalLink className="ml-1 w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
