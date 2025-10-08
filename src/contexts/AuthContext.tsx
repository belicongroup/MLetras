import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  username?: string;
  subscription_type: 'free' | 'pro';
  email_verified: boolean;
  created_at: string;
  last_login_at?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string) => Promise<any>;
  verifyOTP: (email: string, code: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUsername: (username: string) => Promise<any>;
}

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Development mode - bypass authentication for local development
  const isDevMode = process.env.NODE_ENV === 'development' && 
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const [authState, setAuthState] = useState<AuthState>(() => {
    if (isDevMode) {
      // Mock user for development
      return {
        user: {
          id: 'dev-user-123',
          email: 'dev@mletras.com',
          username: 'Developer',
          subscription_type: 'pro',
          email_verified: true,
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        },
        isLoading: false,
        isAuthenticated: true,
      };
    }
    
    return {
      user: null,
      isLoading: true,
      isAuthenticated: false,
    };
  });

  // API base URL for the authentication system
  // Use local development server when running locally
  // For Android emulator, use 10.0.2.2 instead of localhost
  // API URL configuration for different environments
  // Check if we're in local web development (not Android emulator)
  const isLocalWebDev = process.env.NODE_ENV === 'development' && 
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1');
  
  const API_BASE_URL = isLocalWebDev 
    ? 'http://10.0.2.2:8787'  // Use local backend for web development only
    : 'https://mletras-auth-api-dev.belicongroup.workers.dev';  // Using dev worker (production worker broken)

  /**
   * Make authenticated API request
   */
  const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Debug logging for development only
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Debug Info:');
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Full URL:', url);
      console.log('User Agent:', navigator.userAgent);
      console.log('Location:', window.location.href);
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Add session token if available
    const sessionToken = localStorage.getItem('sessionToken');
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Request failed');
      }

      return response.json();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('🚨 Fetch Error:', error);
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      throw error;
    }
  };

  /**
   * Load user from API on mount
   */
  const refreshUser = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        return;
      }

      const response = await makeRequest('/api/user/profile');
      setAuthState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('sessionToken');
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  /**
   * Login with email
   */
  const login = async (email: string) => {
    const response = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response;
  };

  /**
   * Verify OTP code
   */
  const verifyOTP = async (email: string, code: string) => {
    // DEV BYPASS: Auto-login with Pro access for specific email
    const bypassEmail = 'dev@mletras.pro';
    if (email.toLowerCase() === bypassEmail && code === '000000') {
      const mockUser = {
        id: 'dev-pro-user-123',
        email: bypassEmail,
        username: 'ProDev',
        subscription_type: 'pro' as const,
        email_verified: true,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      };
      
      localStorage.setItem('sessionToken', 'dev-bypass-token-' + Date.now());
      setAuthState({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });
      
      console.log('🚀 DEV BYPASS: Logged in as Pro user');
      return { success: true, user: mockUser, message: 'Dev bypass login successful' };
    }

    const response = await makeRequest('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    
    // Store session token if provided
    if (response.success && response.sessionToken) {
      localStorage.setItem('sessionToken', response.sessionToken);
      setAuthState({
        user: response.user,
        isLoading: false,
        isAuthenticated: response.user.username ? true : false, // Only authenticate if user has username
      });
    }
    
    return response;
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await makeRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      localStorage.removeItem('sessionToken');
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  /**
   * Set username for user
   */
  const setUsername = async (username: string) => {
    const response = await makeRequest('/api/user/username', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    
    // Update user state with new username
    if (response.success && authState.user) {
      setAuthState(prev => ({
        ...prev,
        user: {
          ...prev.user!,
          username: response.username,
        },
        isAuthenticated: true, // Now fully authenticated
      }));
    }
    
    return response;
  };

  // Load user on mount (skip in development mode)
  useEffect(() => {
    if (isDevMode) {
      console.log('🚀 Development Mode: Authentication bypassed - logged in as "Developer"');
    } else {
      refreshUser();
    }
  }, [isDevMode]);

  const value: AuthContextType = {
    ...authState,
    login,
    verifyOTP,
    logout,
    refreshUser,
    setUsername,
  };

  return (
    <AuthContext.Provider value={value}>
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
