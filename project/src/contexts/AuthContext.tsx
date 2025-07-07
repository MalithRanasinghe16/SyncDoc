import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for email/password login
const mockUsers = [
  {
    id: '1',
    name: 'Alex Chen',
    email: 'alex@example.com',
    avatar:
      'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    isOnline: true,
    lastSeen: new Date(),
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    avatar:
      'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    isOnline: true,
    lastSeen: new Date(),
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('collabdoc_user');
    const storedToken = localStorage.getItem('collabdoc_token');

    const restoreSession = async () => {
      if (storedToken && storedUser) {
        const isValid = await validateToken(storedToken);
        if (isValid) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } else {
          logout(); // Token expired or invalid
        }
      }
      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const user = mockUsers.find((u) => u.email === email) || mockUsers[0];
    setUser(user);
    localStorage.setItem('collabdoc_user', JSON.stringify(user));
    setIsLoading(false);
  };

  const validateToken = async (accessToken: string): Promise<boolean> => {
    try {
      const res = await axios.get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
      );
      return res.status === 200;
    } catch (error) {
      return false;
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const res = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });

        const googleUser: User = {
          id: res.data.sub,
          name: res.data.name,
          email: res.data.email,
          avatar: res.data.picture,
          isOnline: true,
          lastSeen: new Date(),
        };

        setUser(googleUser);
        setToken(tokenResponse.access_token);
        localStorage.setItem('collabdoc_user', JSON.stringify(googleUser));
        localStorage.setItem('collabdoc_token', tokenResponse.access_token);
      } catch (err) {
        console.error('Google login failed', err);
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
    },
  });

  const loginWithGoogle = async () => {
    googleLogin();
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('collabdoc_user');
    localStorage.removeItem('collabdoc_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}