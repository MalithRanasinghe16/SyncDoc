import React, { useState } from 'react';
import { useDocuments } from '../contexts/DocumentContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  FileText, 
  Share2, 
  MoreVertical, 
  Clock,
  Users,
  Search,
  Grid,
  List,
  Trash2
} from 'lucide-react';
import { Document } from '../types';

interface DashboardProps {
  onOpenDocument: (doc: Document) => void;
}

export default function Dashboard({ onOpenDocument }: DashboardProps) {
  const { 
    documents, 
    createDocument, 
    deleteDocument
  } = useDocuments();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'owned' | 'shared'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'owned' && doc.ownerId === user?.id) ||
      (filter === 'shared' && doc.collaborators.includes(user?.id || ''));
    
    return matchesSearch && matchesFilter;
  });

  const handleCreateDocument = async () => {
    if (newDocTitle.trim()) {
      setIsCreating(true);
      try {
        const newDoc = await createDocument(newDocTitle.trim());
        setNewDocTitle('');
        setShowCreateModal(false);
        onOpenDocument(newDoc);
      } catch (error) {
        console.error('Failed to create document:', error);
        // Error is already handled by DocumentContext
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteDocument(docId);
      } catch (error) {
        console.error('Failed to delete document:', error);
        // Error is already handled by DocumentContext
      }
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Unknown date';
      }
      
      const now = new Date();
      const diff = now.getTime() - dateObj.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', date, error);
      return 'Unknown date';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Documents</h1>
            <p className="text-gray-600">Manage and collaborate on your documents</p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 md:mt-0 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span>New Document</span>
          </button>
        </div>

        {/* Filters and controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'owned' | 'shared')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Documents</option>
              <option value="owned">Owned by me</option>
              <option value="shared">Shared with me</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Documents grid/list */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try adjusting your search terms' : 'Create your first document to get started'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create New Document
            </button>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc)}
                className={`bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group ${
                  viewMode === 'list' ? 'flex items-center p-4' : 'p-6'
                }`}
              >
                {viewMode === 'grid' ? (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{doc.title}</h3>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{formatDate(doc.updatedAt)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {doc.isShared && (
                          <Share2 className="w-4 h-4 text-green-500" />
                        )}
                        {doc.collaborators.length > 0 && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Users className="w-4 h-4 mr-1" />
                            <span>{doc.collaborators.length}</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span>{formatDate(doc.updatedAt)}</span>
                          {doc.collaborators.length > 0 && (
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              <span>{doc.collaborators.length} collaborators</span>
                            </div>
                          )}
                          {doc.isShared && (
                            <div className="flex items-center text-green-600">
                              <Share2 className="w-4 h-4 mr-1" />
                              <span>Shared</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create document modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Document</h3>
            
            <input
              type="text"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="Enter document title..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateDocument()}
              autoFocus
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewDocTitle('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDocument}
                disabled={!newDocTitle.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}