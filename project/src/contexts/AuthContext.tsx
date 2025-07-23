import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";
import apiService from "../services/api";

// Extend Window interface for Google OAuth
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
            }) => void;
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
  deleteAccount: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log("Safety timeout: forcing loading to false");
      setIsLoading(false);
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timeout);
  }, []);

  // Helper function to ensure user object has all required properties
  const normalizeUser = (apiUser: any): User => {
    // Log the incoming user data
    console.log("Normalizing user data:", apiUser);

    const normalizedUser = {
      id: apiUser.id,
      name: apiUser.name,
      email: apiUser.email,
      avatar: apiUser.avatar || null, // Use null instead of empty string for missing avatar
      isOnline: apiUser.isOnline ?? true,
      lastSeen: apiUser.lastSeen || new Date(),
    };

    // Log the normalized user data
    console.log("Normalized user data:", normalizedUser);

    return normalizedUser;
  };

  useEffect(() => {
    // Check for stored token and get current user
    const checkAuth = async () => {
      console.log("Starting auth check...");
      try {
        const token = localStorage.getItem("syncdoc_token");
        console.log("Token found:", token ? "Yes" : "No");
        
        if (token) {
          console.log("Validating token with backend...");
          
          // Add timeout to prevent hanging
          const response = await Promise.race([
            apiService.getCurrentUser(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error("Auth check timeout")), 5000)
            )
          ]);
          
          console.log("User data received:", response.user);
          setUser(normalizeUser(response.user));
          console.log("User state set successfully");
        } else {
          console.log("No token found, user not authenticated");
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("syncdoc_token");
        setUser(null);
      } finally {
        console.log("Auth check completed, setting loading to false");
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
      setUser(normalizeUser(response.user));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed");
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
      setUser(normalizeUser(response.user));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use Google Identity Services
      if (typeof window !== "undefined" && window.google?.accounts?.oauth2) {
        // Add timeout to prevent hanging
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            console.log("Initiating Google OAuth...");
            const tokenClient = window.google!.accounts.oauth2.initTokenClient({
              client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
              scope: "openid email profile",
              callback: async (response: any) => {
                try {
                  if (response.error) {
                    console.error("Google OAuth error:", response.error, response.error_description);
                    reject(new Error(`Google OAuth error: ${response.error_description || response.error}`));
                    return;
                  }
                  
                  if (response.access_token) {
                    console.log(
                      "Got Google access token:",
                      response.access_token.substring(0, 10) + "..."
                    );
                    console.log("Calling backend with Google token...");
                    const apiResponse = await apiService.loginWithGoogle(
                      response.access_token
                    );
                    console.log("Backend response:", apiResponse);
                    
                    if (apiResponse.token) {
                      console.log("JWT token received, storing in localStorage...");
                      localStorage.setItem("syncdoc_token", apiResponse.token);
                    }
                    
                    const normalizedUser = normalizeUser(apiResponse.user);
                    console.log("Setting user state:", normalizedUser);
                    setUser(normalizedUser);
                    console.log("Google login completed successfully");
                    resolve();
                  } else {
                    reject(new Error("No access token received from Google"));
                  }
                } catch (error) {
                  console.error("Google login error:", error);
                  reject(error);
                }
              }
            });
            
            console.log("Requesting access token...");
            tokenClient.requestAccessToken();
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Google login timeout after 60 seconds")), 60000);
          })
        ]);
      } else {
        throw new Error("Google OAuth not loaded. Please refresh the page.");
      }
    } catch (error) {
      console.error("loginWithGoogle error:", error);
      setError(error instanceof Error ? error.message : "Google login failed");
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
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiService.deleteAccount();
      setUser(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Account deletion failed"
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithGoogle,
        register,
        logout,
        deleteAccount,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
