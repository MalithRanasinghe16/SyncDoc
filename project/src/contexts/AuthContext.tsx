import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import apiService from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored token and get current user
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('syncdoc_token');
        if (token) {
          const response = await apiService.getCurrentUser();
          setUser(response.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('syncdoc_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.register(name, email, password);
      setUser(response.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.login(email, password);
      setUser(response.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // This would typically integrate with Google OAuth
      // For now, we'll simulate it
      throw new Error('Google OAuth integration needed');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Google login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      loginWithGoogle, 
      register, 
      logout, 
      isLoading, 
      error 
    }}>
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