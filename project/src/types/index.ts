export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  collaborators: string[];
  createdAt: Date;
  updatedAt: Date;
  isShared: boolean;
  shareLink?: string;
}

export interface Version {
  id: string;
  documentId: string;
  content: string;
  timestamp: Date;
  authorId: string;
  authorName: string;
  changes: string;
}

export interface Cursor {
  userId: string;
  userName: string;
  position: number;
  color: string;
}

export interface UserPresence {
  userId: string;
  userName: string;
  avatar: string;
  cursor?: Cursor;
  isTyping: boolean;
  color: string;
}