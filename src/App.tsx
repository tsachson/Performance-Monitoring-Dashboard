import { useState } from 'react';
import Header from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ProjectsList } from './components/ProjectsList';
import { ProjectDetail } from './components/ProjectDetail';
import { WatchlistMonitoring } from './components/WatchlistMonitoring';
import { RemediationWorkspace } from './components/RemediationWorkspace';
import { PrecedentsSearch } from './components/PrecedentsSearch';
import PerformingProjects from './components/PerformingProjects';
import AlertsTab from './components/AlertsTab';

type View = 'dashboard' | 'alerts' | 'performing' | 'watchlist' | 'remediation' | 'precedents' | 'projects' | 'project-detail';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<View>('projects');

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setPreviousView(currentView);
    setCurrentView('project-detail');
  };

  const handleBackFromProject = () => {
    setSelectedProjectId(null);
    setCurrentView(previousView);
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view as View);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'alerts':
        return <AlertsTab />;
      case 'projects':
        return <ProjectsList onSelectProject={handleSelectProject} />;
      case 'performing':
        return <PerformingProjects />;
      case 'watchlist':
        return <WatchlistMonitoring onSelectProject={handleSelectProject} />;
      case 'remediation':
        return <RemediationWorkspace onSelectProject={handleSelectProject} />;
      case 'precedents':
        return <PrecedentsSearch onSelectProject={handleSelectProject} />;
      case 'project-detail':
        return selectedProjectId ? (
          <ProjectDetail projectId={selectedProjectId} onBack={handleBackFromProject} />
        ) : (
          <ProjectsList onSelectProject={handleSelectProject} />
        );
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={handleNavigate} currentView={currentView} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
