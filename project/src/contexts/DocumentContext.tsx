import React, { createContext, useContext, useState, useEffect } from 'react';
import { Document, Version, UserPresence } from '../types';
import { useAuth } from './AuthContext';

interface DocumentContextType {
  documents: Document[];
  currentDocument: Document | null;
  versions: Version[];
  userPresence: UserPresence[];
  createDocument: (title: string) => Document;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  setCurrentDocument: (doc: Document | null) => void;
  saveVersion: (documentId: string, content: string) => void;
  restoreVersion: (versionId: string) => void;
  updatePresence: (presence: UserPresence) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

// Mock data
const mockDocuments: Document[] = [
  {
    id: '1',
    title: 'Project Proposal Draft',
    content: '<h1>Project Proposal: Next-Gen Collaboration Platform</h1><p>Executive Summary: This document outlines our vision for building a revolutionary real-time collaboration platform that will transform how teams work together...</p><h2>Key Features</h2><ul><li>Real-time collaborative editing</li><li>Advanced version control</li><li>Integrated communication tools</li><li>AI-powered writing assistance</li></ul>',
    ownerId: '1',
    collaborators: ['2'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16'),
    isShared: true,
    shareLink: 'https://collabdoc.app/share/abc123'
  },
  {
    id: '2',
    title: 'Meeting Notes - Q1 Strategy',
    content: '<h1>Q1 Strategy Meeting Notes</h1><p><strong>Date:</strong> January 16, 2024</p><p><strong>Attendees:</strong> Alex Chen, Sarah Johnson, Mike Davis</p><h2>Key Discussion Points</h2><p>1. Market analysis for Q1 showed positive trends...</p>',
    ownerId: '1',
    collaborators: ['2'],
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
    isShared: false
  }
];

const mockVersions: Version[] = [
  {
    id: 'v1',
    documentId: '1',
    content: '<h1>Project Proposal</h1><p>Initial draft...</p>',
    timestamp: new Date('2024-01-15T10:00:00'),
    authorId: '1',
    authorName: 'Alex Chen',
    changes: 'Initial version created'
  },
  {
    id: 'v2',
    documentId: '1',
    content: '<h1>Project Proposal: Next-Gen Platform</h1><p>Updated draft with more details...</p>',
    timestamp: new Date('2024-01-15T14:30:00'),
    authorId: '1',
    authorName: 'Alex Chen',
    changes: 'Added executive summary section'
  }
];

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [versions, setVersions] = useState<Version[]>(mockVersions);
  const [userPresence, setUserPresence] = useState<UserPresence[]>([]);

  const createDocument = (title: string): Document => {
    const newDoc: Document = {
      id: Date.now().toString(),
      title,
      content: '', // Start with empty content
      ownerId: user?.id || '1',
      collaborators: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isShared: false
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    return newDoc;
  };

  const updateDocument = (id: string, updates: Partial<Document>) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, ...updates, updatedAt: new Date() } : doc
    ));
    
    if (currentDocument?.id === id) {
      setCurrentDocument(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null);
    }
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    if (currentDocument?.id === id) {
      setCurrentDocument(null);
    }
  };

  const saveVersion = (documentId: string, content: string) => {
    const newVersion: Version = {
      id: 'v' + Date.now(),
      documentId,
      content,
      timestamp: new Date(),
      authorId: user?.id || '1',
      authorName: user?.name || 'Unknown User',
      changes: 'Auto-saved version'
    };
    
    setVersions(prev => [newVersion, ...prev]);
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
      versions: versions.filter(v => v.documentId === currentDocument?.id),
      userPresence,
      createDocument,
      updateDocument,
      deleteDocument,
      setCurrentDocument,
      saveVersion,
      restoreVersion,
      updatePresence
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