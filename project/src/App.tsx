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
import apiService from './services/api';

type AppView = 'dashboard' | 'editor' | 'versions' | 'settings' | 'shared';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [sharedDocument, setSharedDocument] = useState<Document | null>(null);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [sharedError, setSharedError] = useState<string | null>(null);

  // Check for shared document URL on app load
  useEffect(() => {
    const path = window.location.pathname;
    const sharedMatch = path.match(/^\/shared\/([a-zA-Z0-9]+)$/);
    
    if (sharedMatch) {
      const token = sharedMatch[1];
      
      // If user is not authenticated, redirect to login with return URL
      if (!user && !isLoading) {
        // Store the share token for after login
        localStorage.setItem('pendingShareToken', token);
        setCurrentView('dashboard'); // This will show login
        return;
      }
      
      // If user is authenticated, load the shared document
      if (user) {
        loadSharedDocument(token);
      }
    }
  }, [user, isLoading]);

  const loadSharedDocument = async (token: string) => {
    setIsLoadingShared(true);
    setSharedError(null);
    
    try {
      const response = await apiService.getDocumentByShareToken(token);
      setSharedDocument(response.document);
      setCurrentView('shared');
      // Clear URL to show clean shared document view
      window.history.replaceState({}, '', `/shared/${token}`);
    } catch (error: any) {
      console.error('Failed to load shared document:', error);
      
      // If authentication error, redirect to login
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        localStorage.setItem('pendingShareToken', token);
        setCurrentView('dashboard'); // This will show login
        return;
      }
      
      setSharedError(error.response?.data?.message || 'Failed to load shared document');
    } finally {
      setIsLoadingShared(false);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log("App state changed:", { user: !!user, isLoading });
  }, [user, isLoading]);

  // Reset to dashboard whenever user changes (login/logout/different user)
  useEffect(() => {
    if (user) {
      console.log("User logged in, setting view to dashboard");
      
      // Check if there's a pending share token from before login
      const pendingToken = localStorage.getItem('pendingShareToken');
      if (pendingToken) {
        localStorage.removeItem('pendingShareToken');
        loadSharedDocument(pendingToken);
        return;
      }
      
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

  // Show shared document loading state
  if (isLoadingShared) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading shared document...</p>
        </div>
      </div>
    );
  }

  // Show shared document error
  if (sharedError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Unable to load document</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{sharedError}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to SyncDoc
          </button>
        </div>
      </div>
    );
  }

  // Show shared document (no auth required)
  if (currentView === 'shared' && sharedDocument) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Editor 
          document={sharedDocument} 
          onBack={() => window.location.href = '/'}
          onShowVersions={() => {}} // Disable version history for shared docs
          isSharedView={true}
        />
      </div>
    );
  }

  if (!user && currentView !== 'shared') {
    // Check if there's a pending share token to show appropriate message
    const pendingToken = localStorage.getItem('pendingShareToken');
    return <Login sharedDocumentPending={!!pendingToken} />;
  }

  const handleOpenDocument = (doc: Document) => {
    setCurrentDocument(doc);
    setCurrentView('editor');
  };

  const handleNavigate = (view: 'dashboard' | 'editor' | 'settings') => {
    if (view === 'dashboard') {
      setCurrentDocument(null);
      // Clear pending share token if user navigates to dashboard
      localStorage.removeItem('pendingShareToken');
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
      case 'shared':
        return null; // Handled separately above
      default:
        return <Dashboard onOpenDocument={handleOpenDocument} />;
    }
  };

  return (
    <Layout 
      currentPage={currentView === 'versions' ? 'editor' : (currentView === 'shared' ? 'dashboard' : currentView)} 
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
