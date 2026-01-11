import { useState, useEffect, useRef } from 'react';
import { ArrowUpDown, TrendingUp, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProjectWithIssuer, WatchlistMetrics } from '../types/database';
import { calculateProjectStatus, STATUS_THRESHOLDS } from '../lib/projectStatus';
import { ProjectDetail } from './ProjectDetail';

type SortField = 'project_name' | 'issuer' | 'instrument_type' | 'deal_size' | 'country';
type SortDirection = 'asc' | 'desc';

export default function PerformingProjects() {
  const [projects, setProjects] = useState<ProjectWithIssuer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectWithIssuer | null>(null);
  const [sortField, setSortField] = useState<SortField>('project_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPerformingProjects();
  }, []);

  useEffect(() => {
    checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [projects]);

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

  const fetchPerformingProjects = async () => {
    setLoading(true);
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        issuer:issuers(*)
      `)
      .neq('current_status', 'closed');

    const { data: metricsData, error: metricsError } = await supabase
      .from('watchlist_metrics')
      .select('*');

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
    } else if (metricsError) {
      console.error('Error fetching metrics:', metricsError);
    } else {
      const metricsMap = new Map<string, WatchlistMetrics>();
      (metricsData || []).forEach(m => metricsMap.set(m.project_id, m));

      const performingProjects = (projectsData || []).filter(p => {
        const status = calculateProjectStatus(p, metricsMap.get(p.id));
        return status === 'performing';
      });

      setProjects(performingProjects);
    }
    setLoading(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProjects = [...projects].sort((a, b) => {
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
      default:
        return 0;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
    >
      {label}
      <ArrowUpDown className={`w-4 h-4 ${sortField === field ? 'text-blue-600' : 'text-gray-400'}`} />
    </button>
  );

  if (selectedProject) {
    return (
      <ProjectDetail
        projectId={selectedProject.id}
        onBack={() => {
          setSelectedProject(null);
          fetchPerformingProjects();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading performing projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-8 h-8 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Performing Projects</h2>
            <p className="text-gray-600">Projects with on-time payments and healthy metrics</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="text-3xl font-bold text-green-700">{projects.length}</div>
          <div className="text-sm text-green-600">Total Performing Projects</div>
          <div className="mt-3 pt-3 border-t border-green-300">
            <div className="flex items-start gap-2 text-xs text-green-700">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold mb-1">Categorization Thresholds:</div>
                <div>Debt: DSCR ≥ {STATUS_THRESHOLDS.DEBT.PERFORMING_MIN_DSCR}x</div>
                <div>Equity: Cash Runway ≥ {STATUS_THRESHOLDS.EQUITY.PERFORMING_MIN_RUNWAY} months</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10 flex items-center justify-end pr-2">
              <div className="bg-blue-600 text-white rounded-full p-1 animate-pulse pointer-events-auto">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
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
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <SortButton field="project_name" label="Project" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <SortButton field="issuer" label="Issuer" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <SortButton field="instrument_type" label="Instrument" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <SortButton field="deal_size" label="Deal Size" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <SortButton field="country" label="Country" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProjects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {project.project_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.issuer?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.instrument_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.issuance_currency} {project.deal_size.toLocaleString()}M
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.country}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedProject(project)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No performing projects found.
          </div>
        )}
      </div>
    </div>
  );
}
