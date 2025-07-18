import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { ThemeProvider } from './contexts/ThemeContext';
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

  // Reset to dashboard whenever user changes (login/logout/different user)
  useEffect(() => {
    if (user) {
      setCurrentView('dashboard');
      setCurrentDocument(null);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading SyncDoc...</p>
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

  const renderView = () => {
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
        ) : (
          <Dashboard onOpenDocument={handleOpenDocument} />
        );
      case 'versions':
        return <VersionHistory onBack={() => setCurrentView('editor')} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onOpenDocument={handleOpenDocument} />;
    }
  };

  return (
    <Layout 
      currentPage={currentView === 'versions' ? 'editor' : currentView} 
      onNavigate={handleNavigate}
    >
      {renderView()}
    </Layout>
  );
}

export default function App() {
  try {
    return (
      <ThemeProvider>
        <AuthProvider>
          <DocumentProvider>
            <AppContent />
          </DocumentProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  } catch (error) {
    console.error('App component error:', error);
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
          <p className="text-red-700">Please check the console for details</p>
        </div>
      </div>
    );
  }
}
