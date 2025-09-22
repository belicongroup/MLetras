import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../lib/api';
import { User, AuthResponse } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  signup: (email: string) => Promise<AuthResponse>;
  login: (email: string) => Promise<AuthResponse>;
  verifyOTP: (email: string, code: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  /**
   * Load user from API on mount
   */
  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.getCurrentUser();
      setAuthState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  /**
   * Signup with email
   */
  const signup = useCallback(async (email: string): Promise<AuthResponse> => {
    const response = await apiClient.signup(email);
    return response;
  }, []);

  /**
   * Login with email
   */
  const login = useCallback(async (email: string): Promise<AuthResponse> => {
    const response = await apiClient.login(email);
    return response;
  }, []);

  /**
   * Verify OTP code
   */
  const verifyOTP = useCallback(async (email: string, code: string): Promise<AuthResponse> => {
    const response = await apiClient.verifyOTP(email, code);
    
    // If successful, refresh user data
    if (response.success && response.user) {
      setAuthState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
    }
    
    return response;
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.logout();
    } catch (error) {
      // Ignore logout errors
      console.warn('Logout error:', error);
    } finally {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return {
    ...authState,
    signup,
    login,
    verifyOTP,
    logout,
    refreshUser,
  };
}
