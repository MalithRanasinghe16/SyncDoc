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

  const handleRestore = (versionId: string) => {
    if (confirm('Are you sure you want to restore this version? Current changes will be lost.')) {
      restoreVersion(versionId);
      onBack();
    }
  };

  const formatTimestamp = (date: Date) => {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Version History</h1>
              <p className="text-sm text-gray-600">{currentDocument?.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Version list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Document Versions</h2>
                <p className="text-sm text-gray-600 mt-1">{versions.length} versions available</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {versions.length === 0 ? (
                  <div className="p-6 text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No version history available</p>
                  </div>
                ) : (
                  versions.map((version, index) => (
                    <div
                      key={version.id}
                      onClick={() => setSelectedVersion(version)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedVersion?.id === version.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{version.authorName}</p>
                              <p className="text-xs text-gray-500">{formatTimestamp(version.timestamp)}</p>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">{version.changes}</p>
                          
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVersion(version);
                              }}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
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
                                className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center space-x-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Version preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {selectedVersion ? (
                <>
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Version Preview</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedVersion.authorName} • {formatTimestamp(selectedVersion.timestamp)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleRestore(selectedVersion.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Restore This Version</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div 
                      className="prose prose-lg max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                    />
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Version</h3>
                  <p className="text-gray-600">Choose a version from the list to preview its content</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}