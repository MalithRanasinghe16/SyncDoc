import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { User } from '../types';
import apiService from '../services/api';

// Extend Window interface for Google OAuth
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

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
    setIsLoading(true);
    setError(null);
    try {
      // Use Google Identity Services
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        return new Promise<void>((resolve, reject) => {
          window.google!.accounts.oauth2.initTokenClient({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            scope: 'openid email profile',
            callback: async (response: any) => {
              try {
                if (response.access_token) {
                  const apiResponse = await apiService.loginWithGoogle(response.access_token);
                  setUser(apiResponse.user);
                  resolve();
                } else {
                  reject(new Error('No access token received from Google'));
                }
              } catch (error) {
                reject(error);
              }
            },
          }).requestAccessToken();
        });
      } else {
        throw new Error('Google OAuth not loaded. Please refresh the page.');
      }
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