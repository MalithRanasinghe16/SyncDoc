import React from 'react';
import { useDocuments } from '../contexts/DocumentContext';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  RotateCcw,
  Eye,
  ChevronRight,
  FileText
} from 'lucide-react';
import { Version } from '../types';

interface VersionHistoryProps {
  onBack: () => void;
}

export default function VersionHistory({ onBack }: VersionHistoryProps) {
  const { versions, restoreVersion, currentDocument } = useDocuments();
  const [selectedVersion, setSelectedVersion] = React.useState<Version | null>(null);
  const [isRestoring, setIsRestoring] = React.useState(false);

  const handleRestore = async (versionId: string) => {
    if (confirm('Are you sure you want to restore this version? Current changes will be lost.')) {
      try {
        setIsRestoring(true);
        await restoreVersion(versionId);
        onBack();
      } catch (error) {
        console.error('Failed to restore version:', error);
        // You might want to show a toast notification here
      } finally {
        setIsRestoring(false);
      }
    }
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Version History</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{currentDocument?.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Version list */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Document Versions</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{versions?.length || 0} versions available</p>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {!versions || versions.length === 0 ? (
                  <div className="p-6 text-center">
                    <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No version history available</p>
                  </div>
                ) : (
                  versions.map((version, index) => (
                    <div
                      key={version.id}
                      onClick={() => setSelectedVersion(version)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedVersion?.id === version.id ? 'bg-emerald-50 dark:bg-emerald-900/20 border-r-2 border-emerald-500 dark:border-emerald-400' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{version.authorName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimestamp(version.timestamp)}</p>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{version.changes}</p>
                          
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVersion(version);
                              }}
                              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Preview</span>
                            </button>
                            
                            {index > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestore(version.id);
                                }}
                                disabled={isRestoring}
                                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-medium flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Version preview */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {selectedVersion ? (
                <>
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Version Preview</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {selectedVersion.authorName} • {formatTimestamp(selectedVersion.timestamp)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleRestore(selectedVersion.id)}
                          disabled={isRestoring}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>{isRestoring ? 'Restoring...' : 'Restore This Version'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div 
                      className="prose prose-lg max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                    />
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Version</h3>
                  <p className="text-gray-600 dark:text-gray-400">Choose a version from the list to preview its content</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}