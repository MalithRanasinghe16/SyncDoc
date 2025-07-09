import React, { createContext, useContext, useState, useEffect } from 'react';
import { Document, Version, UserPresence } from '../types';
import { useAuth } from './AuthContext';
import apiService from '../services/api';

interface DocumentContextType {
  documents: Document[];
  currentDocument: Document | null;
  versions: Version[];
  userPresence: UserPresence[];
  isLoading: boolean;
  error: string | null;
  createDocument: (title: string, content?: string) => Promise<Document>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  setCurrentDocument: (doc: Document | null) => void;
  loadDocument: (id: string) => Promise<void>;
  saveVersion: (documentId: string, content: string, changes?: string) => Promise<void>;
  loadVersions: (documentId: string) => Promise<void>;
  restoreVersion: (versionId: string) => void;
  updatePresence: (presence: UserPresence) => void;
  refreshDocuments: () => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [userPresence, setUserPresence] = useState<UserPresence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load documents when user is available
  useEffect(() => {
    if (user) {
      refreshDocuments();
    } else {
      setDocuments([]);
      setCurrentDocument(null);
      setVersions([]);
    }
  }, [user]);

  const refreshDocuments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.getDocuments();
      setDocuments(response.documents || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load documents');
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDocument = async (title: string, content: string = ''): Promise<Document> => {
    if (!user) throw new Error('User not authenticated');
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.createDocument({ title, content });
      const newDoc = response.document;
      
      setDocuments(prev => [newDoc, ...prev]);
      return newDoc;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create document';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const response = await apiService.updateDocument(id, updates);
      const updatedDoc = response.document;
      
      setDocuments(prev => prev.map(doc => 
        doc.id === id ? updatedDoc : doc
      ));
      
      if (currentDocument?.id === id) {
        setCurrentDocument(updatedDoc);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update document');
      throw error;
    }
  };

  const deleteDocument = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    
    setIsLoading(true);
    setError(null);
    try {
      await apiService.deleteDocument(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      
      if (currentDocument?.id === id) {
        setCurrentDocument(null);
        setVersions([]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete document');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocument = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    
    setIsLoading(true);
    setError(null);
    try {
      const document = await apiService.getDocument(id);
      setCurrentDocument(document);
      
      // Also load versions for this document
      await loadVersions(id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load document');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const saveVersion = async (documentId: string, content: string, changes?: string) => {
    if (!user) return;
    
    try {
      const response = await apiService.saveDocumentVersion(documentId, changes || content);
      const newVersion = response.version;
      
      setVersions(prev => [newVersion, ...prev]);
    } catch (error) {
      console.error('Failed to save version:', error);
    }
  };

  const loadVersions = async (documentId: string) => {
    if (!user) return;
    
    try {
      const response = await apiService.getDocumentVersions(documentId);
      setVersions(response.versions || []);
    } catch (error) {
      console.error('Failed to load versions:', error);
      setVersions([]);
    }
  };

  const restoreVersion = (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version && currentDocument) {
      updateDocument(currentDocument.id, { content: version.content });
    }
  };

  const updatePresence = (presence: UserPresence) => {
    setUserPresence(prev => {
      const existing = prev.findIndex(p => p.userId === presence.userId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = presence;
        return updated;
      }
      return [...prev, presence];
    });
  };

  return (
    <DocumentContext.Provider value={{
      documents,
      currentDocument,
      versions,
      userPresence,
      isLoading,
      error,
      createDocument,
      updateDocument,
      deleteDocument,
      setCurrentDocument,
      loadDocument,
      saveVersion,
      loadVersions,
      restoreVersion,
      updatePresence,
      refreshDocuments
    }}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
}