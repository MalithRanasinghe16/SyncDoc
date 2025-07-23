export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  isOnline: boolean;
  lastSeen: Date | string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  collaborators: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  isShared: boolean;
  shareLink?: string;
  shareSettings?: {
    isPublic: boolean;
    allowComments: boolean;
    allowDownload: boolean;
    defaultPermission: "read" | "write" | "comment";
    permissionLinks?: {
      read?: string;
      comment?: string;
      write?: string;
    };
  };
}

export interface ShareSettings {
  documentId: string;
  isPublic: boolean;
  shareUrl: string;
  defaultPermission: "read" | "write" | "comment";
  allowComments: boolean;
  allowDownload: boolean;
  expiresAt?: Date | string;
}

export interface Version {
  id: string;
  documentId: string;
  content: string;
  timestamp: Date | string;
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
