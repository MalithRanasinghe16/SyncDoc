import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DocumentProvider } from './contexts/DocumentContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import VersionHistory from './components/VersionHistory';
import Settings from './components/Settings';
import { Document } from './types';

type AppView = 'dashboard' | 'editor' | 'versions' | 'settings';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600">Loading CollabDoc...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleOpenDocument = (doc: Document) => {
    setCurrentDocument(doc);
    setCurrentView('editor');
  };

  const handleNavigate = (view: 'dashboard' | 'editor' | 'settings') => {
    if (view === 'dashboard') {
      setCurrentDocument(null);
    }
    setCurrentView(view);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onOpenDocument={handleOpenDocument} />;
      case 'editor':
        return currentDocument ? (
          <Editor
            document={currentDocument}
            onBack={() => setCurrentView('dashboard')}
            onShowVersions={() => setCurrentView('versions')}
          />
        ) : null;
      case 'versions':
        return <VersionHistory onBack={() => setCurrentView('editor')} />;
      case 'settings':
        return <Settings onBack={() => setCurrentView('dashboard')} />;
      default:
        return <Dashboard onOpenDocument={handleOpenDocument} />;
    }
  };

  // Don't show layout for editor view to maximize writing space
  if (currentView === 'editor' || currentView === 'versions' || currentView === 'settings') {
    return renderCurrentView();
  }

  return (
    <Layout currentPage={currentView} onNavigate={handleNavigate}>
      {renderCurrentView()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <DocumentProvider>
        <AppContent />
      </DocumentProvider>
    </AuthProvider>
  );
}

export default App;