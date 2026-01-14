import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionService } from '@/services/subscriptionService';
import { isCapacitorEnvironment } from '@/lib/capacitor';

interface SubscriptionStatus {
  isActive: boolean;
  productId: string | null;
  expiresDate: Date | null;
  isInTrial: boolean;
  isInGracePeriod: boolean;
}

interface ProStatusContextType {
  isPro: boolean;
  isLoading: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  refreshProStatus: (force?: boolean) => Promise<void>;
}

const ProStatusContext = createContext<ProStatusContextType | undefined>(undefined);

const COOLDOWN_MS = 60000; // 60 seconds minimum between checks
const FALLBACK_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes fallback interval
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 500;
const VERIFICATION_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours cache for Apple verification

const isDevelopment = process.env.NODE_ENV !== 'production';

export function ProStatusProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  
  // Initialize from cache to prevent flash
  const [isPro, setIsPro] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cached_pro_status');
      return cached === 'true';
    }
    return false;
  });
  
  // Start with false - never block UI on ProStatus loading
  // We use cached data immediately and update in background
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  
  // In-flight lock and cooldown tracking
  const isCheckingRef = useRef(false);
  const lastCheckedRef = useRef<number>(0);
  const retryCountRef = useRef(0);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to track current state without causing dependency issues
  const isProRef = useRef(isPro);
  const subscriptionStatusRef = useRef(subscriptionStatus);
  
  // Cache for Apple verification results (transactionId -> { verified: boolean, timestamp: number })
  const verificationCacheRef = useRef<Map<string, { verified: boolean; timestamp: number }>>(new Map());
  
  // Keep refs in sync with state
  useEffect(() => {
    isProRef.current = isPro;
    subscriptionStatusRef.current = subscriptionStatus;
  }, [isPro, subscriptionStatus]);

  /**
   * Verify transaction ID with Apple App Store Server API
   * Uses caching to avoid excessive API calls
   */
  const verifyTransactionWithApple = useCallback(async (transactionId: string): Promise<boolean> => {
    // Check cache first
    const cached = verificationCacheRef.current.get(transactionId);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < VERIFICATION_CACHE_MS) {
        if (isDevelopment) {
          console.log(`✅ ProStatus: Using cached Apple verification for transaction ${transactionId} (age: ${Math.round(age / 1000 / 60)}min)`);
        }
        return cached.verified;
      }
      // Cache expired, remove it
      verificationCacheRef.current.delete(transactionId);
    }

    try {
      // Get API base URL
      const isLocalWebDev = process.env.NODE_ENV === 'development' && 
        typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1');
      
      const API_BASE_URL = isLocalWebDev 
        ? 'http://10.0.2.2:8787'
        : 'https://mletras-auth-api-dev.belicongroup.workers.dev';

      // Get verification token from environment
      const verifyToken = import.meta.env?.VITE_VERIFY_ENDPOINT_TOKEN;
      
      if (!verifyToken) {
        if (isDevelopment) {
          console.warn('⚠️ ProStatus: VITE_VERIFY_ENDPOINT_TOKEN not set - cannot verify transaction');
        }
        return false;
      }

      if (isDevelopment) {
        console.log(`🔍 ProStatus: Verifying transaction ${transactionId} with Apple...`);
      }

      const response = await fetch(`${API_BASE_URL}/verify-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${verifyToken}`,
        },
        body: JSON.stringify({ transactionId }),
      });

      if (!response.ok) {
        if (isDevelopment) {
          console.error(`❌ ProStatus: Apple verification failed: ${response.status}`);
        }
        // Cache negative result for shorter time (5 minutes) to allow retry
        verificationCacheRef.current.set(transactionId, {
          verified: false,
          timestamp: Date.now() - (VERIFICATION_CACHE_MS - 5 * 60 * 1000)
        });
        return false;
      }

      const data = await response.json();
      
      // Check if Apple returned valid transaction data
      // Apple API returns transaction info in the 'apple' field
      const isValid = data.ok === true && data.apple && typeof data.apple === 'object';
      
      if (isDevelopment) {
        console.log(`✅ ProStatus: Apple verification result for ${transactionId}:`, isValid ? 'VALID' : 'INVALID');
      }

      // Cache result
      verificationCacheRef.current.set(transactionId, {
        verified: isValid,
        timestamp: Date.now()
      });

      return isValid;
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ ProStatus: Apple verification error:', error);
      }
      // Don't cache errors - allow retry on next check
      return false;
    }
  }, []);

  /**
   * Get user metadata including transaction ID from backend
   */
  const getUserMetadata = useCallback(async (): Promise<{ transactionId?: string; subscriptionUpdatedAt?: string } | null> => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        return null;
      }

      const isLocalWebDev = process.env.NODE_ENV === 'development' && 
        typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1');
      
      const API_BASE_URL = isLocalWebDev 
        ? 'http://10.0.2.2:8787'
        : 'https://mletras-auth-api-dev.belicongroup.workers.dev';

      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (isDevelopment) {
          console.warn('⚠️ ProStatus: Failed to fetch user profile for metadata');
        }
        return null;
      }

      const data = await response.json();
      const user = data.user;
      
      if (!user || !user.metadata) {
        return null;
      }

      // Parse metadata JSON
      let metadata: any = {};
      try {
        metadata = typeof user.metadata === 'string' 
          ? JSON.parse(user.metadata) 
          : user.metadata;
      } catch (e) {
        if (isDevelopment) {
          console.warn('⚠️ ProStatus: Failed to parse user metadata');
        }
        return null;
      }

      return {
        transactionId: metadata.last_transaction_id,
        subscriptionUpdatedAt: metadata.subscription_updated_at,
      };
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ ProStatus: Error fetching user metadata:', error);
      }
      return null;
    }
  }, []);

  /**
   * Check Pro status with cooldown and in-flight lock
   */
  const checkProStatus = useCallback(async (force = false): Promise<boolean> => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckedRef.current;
    
    // Cooldown check (unless forced)
    if (!force && timeSinceLastCheck < COOLDOWN_MS) {
      if (isDevelopment) {
        console.log(`⏸️ ProStatus: Skipping check (cooldown active, ${Math.round((COOLDOWN_MS - timeSinceLastCheck) / 1000)}s remaining)`);
      }
      return isProRef.current;
    }
    
    // In-flight lock check
    if (isCheckingRef.current) {
      if (isDevelopment) {
        console.log('⏸️ ProStatus: Check already in progress, skipping');
      }
      return isProRef.current;
    }
    
    isCheckingRef.current = true;
    lastCheckedRef.current = now;
    
    try {
      // Always check StoreKit first (works for both guests and authenticated users)
      const storeKitStatus = await subscriptionService.checkSubscriptionStatus();
      
      if (isDevelopment) {
        console.log('🔍 ProStatus: StoreKit check result:', storeKitStatus);
      }
      
      let newIsPro = false;
      let newStatus: SubscriptionStatus = {
        isActive: false,
        productId: null,
        expiresDate: null,
        isInTrial: false,
        isInGracePeriod: false,
      };
      
      if (storeKitStatus.isActive) {
        newIsPro = true;
        newStatus = {
          isActive: true,
          productId: storeKitStatus.productId,
          expiresDate: storeKitStatus.expiresDate,
          isInTrial: storeKitStatus.isInTrial,
          isInGracePeriod: storeKitStatus.isInGracePeriod,
        };
        
        if (isDevelopment) {
          console.log('✅ ProStatus: Pro subscription active via StoreKit');
        }
      } else if (isAuthenticated && user?.subscription_type === 'pro') {
        // Fallback to backend status for authenticated users - but verify with Apple
        if (isDevelopment) {
          console.log('🔍 ProStatus: StoreKit inactive, checking database fallback with Apple verification...');
        }

        // Get transaction ID from user metadata
        const metadata = await getUserMetadata();
        const transactionId = metadata?.transactionId;

        if (!transactionId) {
          if (isDevelopment) {
            console.warn('⚠️ ProStatus: Database shows pro but no transaction ID - cannot verify. Denying pro access.');
          }
          newIsPro = false;
        } else {
          // Verify transaction with Apple
          const isVerified = await verifyTransactionWithApple(transactionId);
          
          if (isVerified) {
            newIsPro = true;
            newStatus = {
              isActive: true,
              productId: null,
              expiresDate: null,
              isInTrial: false,
              isInGracePeriod: false,
            };
            
            if (isDevelopment) {
              console.log('✅ ProStatus: Pro subscription verified via Apple (database fallback)');
            }
          } else {
            if (isDevelopment) {
              console.warn('⚠️ ProStatus: Database shows pro but Apple verification failed. Denying pro access.');
            }
            newIsPro = false;
          }
        }
      } else {
        if (isDevelopment) {
          console.log('ℹ️ ProStatus: No active Pro subscription');
        }
      }
      
      // Only update state if values actually changed
      if (newIsPro !== isProRef.current || 
          newStatus.isActive !== subscriptionStatusRef.current?.isActive ||
          newStatus.productId !== subscriptionStatusRef.current?.productId) {
        setIsPro(newIsPro);
        setSubscriptionStatus(newStatus);
        
        // Cache Pro status
        if (typeof window !== 'undefined') {
          localStorage.setItem('cached_pro_status', String(newIsPro));
        }
        
        retryCountRef.current = 0; // Reset retry count on success
      }
      
      setIsLoading(false);
      return newIsPro;
    } catch (error) {
      if (isDevelopment) {
        console.error('❌ ProStatus: Failed to check Pro status:', error);
      }
      
      // On error, try database fallback with Apple verification if authenticated
      if (isAuthenticated && user?.subscription_type === 'pro') {
        try {
          const metadata = await getUserMetadata();
          const transactionId = metadata?.transactionId;

          if (transactionId) {
            const isVerified = await verifyTransactionWithApple(transactionId);
            if (isVerified) {
              const newIsPro = true;
              if (newIsPro !== isProRef.current) {
                setIsPro(newIsPro);
                setSubscriptionStatus({
                  isActive: true,
                  productId: null,
                  expiresDate: null,
                  isInTrial: false,
                  isInGracePeriod: false,
                });
                if (typeof window !== 'undefined') {
                  localStorage.setItem('cached_pro_status', 'true');
                }
              }
              setIsLoading(false);
              return true;
            }
          }
        } catch (verifyError) {
          if (isDevelopment) {
            console.error('❌ ProStatus: Error during fallback verification:', verifyError);
          }
        }
      }
      
      // If we get here, no valid subscription found
      const newIsPro = false;
      if (newIsPro !== isProRef.current) {
        setIsPro(newIsPro);
        setSubscriptionStatus({
          isActive: false,
          productId: null,
          expiresDate: null,
          isInTrial: false,
          isInGracePeriod: false,
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('cached_pro_status', 'false');
        }
      }
      setIsLoading(false);
      return false;
    } finally {
      isCheckingRef.current = false;
    }
  }, [isAuthenticated, user?.subscription_type, verifyTransactionWithApple, getUserMetadata]);

  /**
   * Public refresh function (can be called with force flag)
   */
  const refreshProStatus = useCallback(async (force = false) => {
    await checkProStatus(force);
  }, [checkProStatus]);

  /**
   * Handle subscription update events with retry logic
   */
  const handleSubscriptionUpdate = useCallback(async () => {
    if (isDevelopment) {
      console.log('🔄 ProStatus: Subscription update event received - re-checking...');
    }
    
    retryCountRef.current = 0;
    
    // Clear any existing retry interval
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
    
    // Immediate check (force bypass cooldown)
    const wasPro = await checkProStatus(true);
    
    // If still not Pro, retry with delays (StoreKit might need time to update)
    if (!wasPro && retryCountRef.current < MAX_RETRIES) {
      retryIntervalRef.current = setInterval(async () => {
        retryCountRef.current++;
        
        if (isDevelopment) {
          console.log(`🔄 ProStatus: Retry ${retryCountRef.current}/${MAX_RETRIES} - checking Pro status...`);
        }
        
        const isNowPro = await checkProStatus(true);
        
        if (isNowPro || retryCountRef.current >= MAX_RETRIES) {
          if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current);
            retryIntervalRef.current = null;
          }
          if (retryCountRef.current >= MAX_RETRIES && !isNowPro) {
            if (isDevelopment) {
              console.warn('⚠️ ProStatus: Pro status check exhausted retries');
            }
          }
        }
      }, RETRY_DELAY_MS);
      
      // Clear retry after max time
      setTimeout(() => {
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
      }, MAX_RETRIES * RETRY_DELAY_MS);
    }
  }, [checkProStatus]);

  /**
   * Handle app visibility changes (foreground/background)
   */
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      if (isDevelopment) {
        console.log('👁️ ProStatus: App returned to foreground - checking status...');
      }
      checkProStatus(false); // Respect cooldown
    }
  }, [checkProStatus]);

  // Initial check on mount - defer StoreKit calls to avoid blocking startup
  useEffect(() => {
    // Defer StoreKit check significantly to avoid blocking startup
    // StoreKit calls can take 2-5 seconds, so we delay to let UI render first
    const timeoutId = setTimeout(() => {
      checkProStatus(false);
    }, 2000); // 2 second delay to let UI render and become interactive first
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Listen for subscription update events
  useEffect(() => {
    window.addEventListener('subscription-updated', handleSubscriptionUpdate);
    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionUpdate);
    };
  }, [handleSubscriptionUpdate]);

  // Listen for app visibility changes (foreground/background)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [handleVisibilityChange]);

  // Long fallback interval (safety net)
  useEffect(() => {
    const fallbackInterval = setInterval(() => {
      if (isDevelopment) {
        console.log('⏰ ProStatus: Fallback interval check (20 minutes)');
      }
      checkProStatus(false); // Respect cooldown
    }, FALLBACK_INTERVAL_MS);

    return () => {
      clearInterval(fallbackInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set up once on mount

  // Cleanup retry interval on unmount
  useEffect(() => {
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, []);

  // Re-check when auth state changes
  useEffect(() => {
    checkProStatus(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.subscription_type]); // Only when auth state changes

  return (
    <ProStatusContext.Provider
      value={{
        isPro,
        isLoading,
        subscriptionStatus,
        refreshProStatus,
      }}
    >
      {children}
    </ProStatusContext.Provider>
  );
}

export function useProStatus() {
  const context = useContext(ProStatusContext);
  if (context === undefined) {
    throw new Error('useProStatus must be used within a ProStatusProvider');
  }
  return context;
}

