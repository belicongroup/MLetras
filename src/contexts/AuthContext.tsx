import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { subscriptionService } from '@/services/subscriptionService';
import { userDataApi } from '@/services/userDataApi';

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
  loginWithApple: (identityToken: string, authorizationCode?: string, email?: string, userIdentifier?: string) => Promise<any>;
  loginWithGoogle: (idToken: string, accessToken?: string, email?: string) => Promise<any>;
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
  // Initialize with cached user data immediately (non-blocking)
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (typeof window !== 'undefined') {
      const sessionToken = localStorage.getItem('sessionToken');
      const cachedUser = localStorage.getItem('cached_user');
      
      if (sessionToken && cachedUser) {
        try {
          const user = JSON.parse(cachedUser);
          return {
            user,
            isLoading: false, // Start with false, will be set to true during refresh
            isAuthenticated: true,
          };
        } catch (e) {
          // Invalid cache, fall through to default
        }
      }
    }
    
    return {
      user: null,
      isLoading: false, // Don't block UI - check in background
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
    
    // Convert headers to plain object if needed
    const headersObj: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Handle headers from options (could be Headers object or plain object)
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headersObj[key] = value;
        });
      } else if (typeof options.headers === 'object') {
        Object.assign(headersObj, options.headers);
      }
    }
    
    const headers = headersObj;
    
    // Add session token if available
    const sessionToken = localStorage.getItem('sessionToken');
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: any = {};
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        const errorMessage = errorData.error || errorData.message || `Request failed with status ${response.status}`;
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        (error as any).data = errorData;
        throw error;
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Handle AbortError (timeout)
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timed out. Please check your connection and try again.');
        (timeoutError as any).isNetworkError = true;
        (timeoutError as any).status = 0;
        if (process.env.NODE_ENV === 'development') {
          console.error('🚨 Request Timeout:', timeoutError);
        }
        throw timeoutError;
      }
      
      // Handle network errors with user-friendly messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network connectivity issue
        const networkError = new Error('Unable to connect to the server. Please check your internet connection and try again.');
        (networkError as any).isNetworkError = true;
        (networkError as any).status = 0;
        if (process.env.NODE_ENV === 'development') {
          console.error('🚨 Network Error:', networkError);
        }
        throw networkError;
      }
      
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
   * Sync subscription status from StoreKit to backend
   * Called after authentication to ensure backend reflects actual subscription status
   * This fixes the issue where guest users who purchased Pro then sign in don't have backend updated
   */
  const syncSubscriptionStatus = async (skipUserRefresh = false) => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        return; // Can't sync without authentication
      }

      // Check StoreKit subscription status
      const storeKitStatus = await subscriptionService.checkSubscriptionStatus();
      
      // Get current backend status
      let backendIsPro = false;
      let currentUser: User | null = null;
      try {
        const userResponse = await makeRequest('/api/user/profile');
        currentUser = userResponse.user;
        backendIsPro = currentUser?.subscription_type === 'pro';
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ Could not check backend status:', e);
        }
        return; // Can't sync if we can't check status
      }

      // Sync UP: If StoreKit shows Pro but backend doesn't, update backend to Pro
      if (storeKitStatus.isActive && !backendIsPro) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔄 Syncing Pro subscription status to backend (guest Pro user signed in)...');
        }
        
        // Get subscription details including transaction ID and metadata
        const subscriptionDetails = await subscriptionService.getSubscriptionDetails();
        const transactionId = subscriptionDetails?.transactionId;
        
        if (transactionId) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('📋 Found transaction ID for sync:', transactionId);
            console.log('📋 Subscription metadata:', {
              transactionId: subscriptionDetails.transactionId,
              originalTransactionId: subscriptionDetails.originalTransactionId,
              purchaseDate: subscriptionDetails.purchaseDate ? new Date(subscriptionDetails.purchaseDate).toISOString() : undefined,
              expiresDate: subscriptionDetails.expiresDate ? new Date(subscriptionDetails.expiresDate).toISOString() : undefined,
            });
          }
        }
        
        // Update backend subscription status with transaction ID
        await userDataApi.updateSubscriptionStatus(true, transactionId);
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Backend subscription status synced to Pro' + (transactionId ? ` (Transaction: ${transactionId})` : ''));
        }
        
        // Update user state to reflect Pro status (unless explicitly skipped)
        if (!skipUserRefresh && currentUser) {
          const updatedUser = {
            ...currentUser,
            subscription_type: 'pro' as const,
          };
          localStorage.setItem('cached_user', JSON.stringify(updatedUser));
          setAuthState(prev => ({
            ...prev,
            user: updatedUser,
          }));
        }
      }
      // Sync DOWN: If StoreKit shows inactive but backend shows Pro, update backend to Free
      else if (!storeKitStatus.isActive && backendIsPro) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔄 Syncing subscription cancellation to backend (subscription expired/cancelled)...');
        }
        
        // Update backend subscription status to free (subscription was cancelled/expired)
        await userDataApi.updateSubscriptionStatus(false);
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Backend subscription status synced to Free (subscription cancelled/expired)');
        }
        
        // Update user state to reflect Free status (unless explicitly skipped)
        if (!skipUserRefresh && currentUser) {
          const updatedUser = {
            ...currentUser,
            subscription_type: 'free' as const,
          };
          localStorage.setItem('cached_user', JSON.stringify(updatedUser));
          setAuthState(prev => ({
            ...prev,
            user: updatedUser,
          }));
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ Subscription status sync failed (non-blocking):', error);
      }
      // Don't throw - StoreKit is source of truth, backend sync is optional
    }
  };

  /**
   * Load user from API on mount
   * Optimized to not block UI - uses cached data first, then refreshes in background
   */
  const refreshUser = async () => {
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
      setAuthState(prev => ({
        ...prev,
        user: null,
        isLoading: false,
        isAuthenticated: false,
      }));
      return;
    }

    // Only set loading if we don't have cached data
    const hasCachedData = localStorage.getItem('cached_user') !== null;
    if (!hasCachedData) {
      setAuthState(prev => ({ ...prev, isLoading: true }));
    }

    try {
      const response = await makeRequest('/api/user/profile');
      
      // Cache the user profile for offline use
      localStorage.setItem('cached_user', JSON.stringify(response.user));
      
      setAuthState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      // Sync subscription status after loading user (check StoreKit and update backend if needed)
      // Skip user refresh since we just loaded the user - only update state if backend changes
      syncSubscriptionStatus(true).catch(err => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ Subscription sync failed (non-blocking):', err);
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to load user:', error);
      }
      
      // Try to use cached user data instead of logging out (offline mode support)
      const cachedUser = localStorage.getItem('cached_user');
      if (cachedUser) {
        try {
          const user = JSON.parse(cachedUser);
          setAuthState({
            user,
            isLoading: false,
            isAuthenticated: true,
          });
          if (process.env.NODE_ENV !== 'production') {
            console.warn('⚠️ Using cached user profile (offline mode)');
          }
          return;
        } catch (parseError) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Failed to parse cached user:', parseError);
          }
        }
      }
      
      // Only clear session if we have no cached data
      localStorage.removeItem('sessionToken');
      setAuthState(prev => ({
        ...prev,
        user: null,
        isLoading: false,
        isAuthenticated: false,
      }));
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
    const response = await makeRequest('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    
    // Store session token if provided
    if (response.success && response.sessionToken) {
      localStorage.setItem('sessionToken', response.sessionToken);
      // Cache user profile for offline use
      localStorage.setItem('cached_user', JSON.stringify(response.user));
      setAuthState({
        user: response.user,
        isLoading: false,
        isAuthenticated: response.user.username ? true : false, // Only authenticate if user has username
      });
      
      // Sync subscription status from StoreKit to backend (for guest users who purchased Pro)
      // This ensures backend database reflects actual subscription status
      syncSubscriptionStatus().catch(err => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ Subscription sync failed after login (non-blocking):', err);
        }
      });
    }
    
    return response;
  };

  /**
   * Login with Apple
   */
  const loginWithApple = async (identityToken: string, authorizationCode?: string, email?: string, userIdentifier?: string) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🍎 Calling /auth/apple endpoint...');
        console.log('API_BASE_URL:', API_BASE_URL);
      }
      const response = await makeRequest('/auth/apple', {
        method: 'POST',
        body: JSON.stringify({ 
          identityToken,
          authorizationCode,
          email,
          userIdentifier 
        }),
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('🍎 Apple auth response:', response);
      }
      
      // Store session token if provided
      if (response.success && response.sessionToken) {
        localStorage.setItem('sessionToken', response.sessionToken);
        // Cache user profile for offline use
        localStorage.setItem('cached_user', JSON.stringify(response.user));
        setAuthState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true, // Apple sign-in always authenticates
        });
        
        // Sync subscription status from StoreKit to backend (for guest users who purchased Pro)
        // This ensures backend database reflects actual subscription status
        syncSubscriptionStatus().catch(err => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('⚠️ Subscription sync failed after Apple login (non-blocking):', err);
          }
        });
      }
      
      return response;
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('🍎 Apple login error:', error);
        console.error('Error status:', error.status);
        console.error('Error data:', error.data);
      }
      // Re-throw with more context
      if (error.status === 404) {
        throw new Error(`Backend endpoint not found. Please ensure the backend is deployed and accessible at ${API_BASE_URL}/auth/apple`);
      }
      throw error;
    }
  };

  /**
   * Login with Google
   */
  const loginWithGoogle = async (idToken: string, accessToken?: string, email?: string) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔵 Calling /auth/google endpoint...');
        console.log('API_BASE_URL:', API_BASE_URL);
      }
      const response = await makeRequest('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ 
          idToken,
          accessToken,
          email
        }),
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔵 Google auth response:', response);
      }
      
      // Store session token if provided
      if (response.success && response.sessionToken) {
        localStorage.setItem('sessionToken', response.sessionToken);
        // Cache user profile for offline use
        localStorage.setItem('cached_user', JSON.stringify(response.user));
        setAuthState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true, // Google sign-in always authenticates
        });
        
        // Sync subscription status from StoreKit to backend (for guest users who purchased Pro)
        // This ensures backend database reflects actual subscription status
        syncSubscriptionStatus().catch(err => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('⚠️ Subscription sync failed after Google login (non-blocking):', err);
          }
        });
      }
      
      return response;
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('🔵 Google login error:', error);
        console.error('Error status:', error.status);
        console.error('Error data:', error.data);
      }
      // Re-throw with more context
      if (error.status === 404) {
        throw new Error(`Backend endpoint not found. Please ensure the backend is deployed and accessible at ${API_BASE_URL}/auth/google`);
      }
      throw error;
    }
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
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Logout error:', error);
        }
      } finally {
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('cached_user');
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
      const updatedUser = {
        ...authState.user,
        username: response.username,
      };
      // Cache updated user profile
      localStorage.setItem('cached_user', JSON.stringify(updatedUser));
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
        isAuthenticated: true, // Now fully authenticated
      }));
      
      // Sync subscription status from StoreKit to backend (for guest users who purchased Pro)
      // This ensures backend database reflects actual subscription status
      syncSubscriptionStatus().catch(err => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ Subscription sync failed after setting username (non-blocking):', err);
        }
      });
    }
    
    return response;
  };

  // Load user on mount - use cached data first, then refresh in background
  useEffect(() => {
    // Always defer network requests to avoid blocking startup
    // Even without cache, show UI immediately and check in background
    const sessionToken = localStorage.getItem('sessionToken');
    const cachedUser = localStorage.getItem('cached_user');
    
    if (sessionToken && cachedUser) {
      // We have cached data, refresh in background after UI renders
      // Delay significantly to let UI become interactive first
      setTimeout(() => {
        refreshUser();
      }, 1500); // 1.5 second delay to let UI render
    } else if (sessionToken) {
      // Have token but no cache - check after UI renders
      setTimeout(() => {
        refreshUser();
      }, 1000); // 1 second delay
    } else {
      // No session - set state immediately (no network call needed)
      setAuthState(prev => ({
        ...prev,
        user: null,
        isLoading: false,
        isAuthenticated: false,
      }));
    }
  }, []);

  const value: AuthContextType = {
    ...authState,
    login,
    verifyOTP,
    loginWithApple,
    loginWithGoogle,
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
