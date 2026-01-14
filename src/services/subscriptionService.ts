// Subscription Service for StoreKit Integration
import { CapacitorInAppPurchase } from '@adplorg/capacitor-in-app-purchase';
import { isCapacitorEnvironment } from '@/lib/capacitor';
import { userDataApi } from './userDataApi';

// Your subscription product IDs from App Store Connect
export const SUBSCRIPTION_PRODUCT_ID_MONTHLY = 'com.mletras.pro.monthly';
export const SUBSCRIPTION_PRODUCT_ID_YEARLY = 'com.mletras.yearly';
// Keep the old constant for backward compatibility (defaults to monthly)
export const SUBSCRIPTION_PRODUCT_ID = SUBSCRIPTION_PRODUCT_ID_MONTHLY;

export interface SubscriptionStatus {
  isActive: boolean;
  productId: string | null;
  expiresDate: string | null;
  isInTrial: boolean;
  isInGracePeriod: boolean;
}

export interface SubscriptionDetails {
  transactionId?: string;
  originalTransactionId?: string;
  purchaseDate?: number;
  expiresDate?: number;
  productId?: string;
  [key: string]: any; // Allow other metadata fields
}

class SubscriptionService {
  /**
   * Generate a valid UUID v4 for reference tracking
   */
  private generateUUID(): string {
    // Use crypto.randomUUID() if available (modern browsers/iOS)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback: Generate UUID v4 manually
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get product information from App Store
   */
  async getProductInfo(productId: string = SUBSCRIPTION_PRODUCT_ID) {
    if (!isCapacitorEnvironment()) {
      // Mock data for web development
      const isYearly = productId === SUBSCRIPTION_PRODUCT_ID_YEARLY;
      return {
        productId,
        price: isYearly ? '$99.99' : '$9.99',
        title: isYearly ? 'MLetras Pro Yearly' : 'MLetras Pro',
        description: 'Unlock unlimited folders, unlimited notes, auto-scroll lyrics, dark theme, and priority support.',
      };
    }

    try {
      const result = await CapacitorInAppPurchase.getProduct({ productId });
      
      if (result.product) {
        return {
          productId: result.product.id,
          price: result.product.displayPrice,
          title: result.product.displayName,
          description: result.product.description,
        };
      }

      throw new Error('Product not found');
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Failed to get product info:', error);
      }
      // Return mock data on error for graceful degradation
      const isYearly = productId === SUBSCRIPTION_PRODUCT_ID_YEARLY;
      return {
        productId,
        price: isYearly ? '$99.99' : '$9.99',
        title: isYearly ? 'MLetras Pro Yearly' : 'MLetras Pro',
        description: 'Unlock unlimited folders, unlimited notes, auto-scroll lyrics, dark theme, and priority support.',
      };
    }
  }

  /**
   * Purchase a subscription
   */
  async purchaseSubscription(productId: string = SUBSCRIPTION_PRODUCT_ID): Promise<{ success: boolean; transactionId?: string }> {
    if (!isCapacitorEnvironment()) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ Purchase: Not in Capacitor environment, cannot make real purchase');
      }
      return { success: false };
    }

    try {
      // Generate a unique reference UUID for this purchase (must be valid UUID format)
      const referenceUUID = this.generateUUID();
      
      const result = await CapacitorInAppPurchase.purchaseSubscription({
        productId,
        referenceUUID,
      });
      
      if (result.transaction) {
        // Parse transaction to extract transactionId
        let transactionId: string | undefined;
        try {
          const transactionData = typeof result.transaction === 'string' 
            ? JSON.parse(result.transaction) 
            : result.transaction;
          transactionId = transactionData.transactionId || transactionData.transaction_id || result.transaction;
        } catch (e) {
          // If parsing fails, use transaction as-is
          transactionId = typeof result.transaction === 'string' ? result.transaction : undefined;
        }

        // Verify transaction with backend (non-blocking, for logging)
        if (transactionId) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('📤 Calling verify-transaction endpoint for transaction:', transactionId);
          }
          this.verifyTransactionWithBackend(transactionId).catch(err => {
            // Log error for debugging
            if (process.env.NODE_ENV !== 'production') {
              console.error('⚠️ Transaction verification failed (non-blocking):', err);
            }
          });
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('⚠️ No transactionId found in purchase result:', result.transaction);
          }
        }

        // Update subscription status on backend (only if user is authenticated)
        // Guest users can purchase without account - backend sync is optional
        const isAuthenticated = typeof localStorage !== 'undefined' && localStorage.getItem('sessionToken');
        if (isAuthenticated) {
          await this.updateBackendSubscriptionStatus(true, result.transaction);
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log('✅ Purchase successful (guest user) - Pro features unlocked via StoreKit');
          }
        }
        
        return {
          success: true,
          transactionId: transactionId || result.transaction,
        };
      }

      return { success: false };
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Purchase failed:', error);
      }
      
      // Handle user cancellation gracefully
      if (error.message?.includes('cancel') || error.message?.includes('Cancelled')) {
        throw new Error('Purchase cancelled by user');
      }
      
      throw error;
    }
  }

  /**
   * Manually verify a transaction ID (for testing/debugging)
   */
  async verifyTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('📤 Manually verifying transaction:', transactionId);
      }
      await this.verifyTransactionWithBackend(transactionId);
      return { success: true };
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Manual verification failed:', error);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<{ success: boolean; restored: boolean }> {
    if (!isCapacitorEnvironment()) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ Restore: Not in Capacitor environment');
      }
      return { success: false, restored: false };
    }

    try {
      const result = await CapacitorInAppPurchase.getActiveSubscriptions();
      
      // Check if user has active subscription
      // Subscriptions array contains JSON strings, parse to check productId
      let hasActiveSubscription = false;
      if (result.subscriptions && Array.isArray(result.subscriptions)) {
        for (const subscription of result.subscriptions) {
          try {
            const subData = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
            // Check for both monthly and yearly subscriptions
            if (subData.productId === SUBSCRIPTION_PRODUCT_ID_MONTHLY || 
                subData.productId === SUBSCRIPTION_PRODUCT_ID_YEARLY) {
              hasActiveSubscription = true;
              if (process.env.NODE_ENV !== 'production') {
                console.log('✅ Restore: Subscription verified:', subData.productId);
              }
              break;
            }
          } catch (parseError) {
            // Fallback: check if it's the product ID directly
            if (subscription === SUBSCRIPTION_PRODUCT_ID_MONTHLY || 
                subscription === SUBSCRIPTION_PRODUCT_ID_YEARLY) {
              hasActiveSubscription = true;
              if (process.env.NODE_ENV !== 'production') {
                console.log('✅ Restore: Subscription verified (direct match):', subscription);
              }
              break;
            }
          }
        }
      }

      if (hasActiveSubscription) {
        // Extract transaction ID and verify (for guest transaction logging)
        let transactionId: string | undefined;
        if (result.subscriptions && Array.isArray(result.subscriptions)) {
          for (const subscription of result.subscriptions) {
            try {
              const subData = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
              if ((subData.productId === SUBSCRIPTION_PRODUCT_ID_MONTHLY || 
                   subData.productId === SUBSCRIPTION_PRODUCT_ID_YEARLY) && 
                  subData.transactionId) {
                transactionId = subData.transactionId;
                if (process.env.NODE_ENV !== 'production') {
                  console.log('📤 Found transaction ID from restore:', transactionId);
                }
                break;
              }
            } catch (e) {
              // Continue to next subscription
            }
          }
        }

        // Verify transaction with backend (non-blocking, for logging)
        if (transactionId) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('📤 Verifying transaction from restore:', transactionId);
          }
          this.verifyTransactionWithBackend(transactionId).catch(err => {
            if (process.env.NODE_ENV !== 'production') {
              console.error('⚠️ Transaction verification failed (non-blocking):', err);
            }
          });
        }

        // Update backend only if user is authenticated (optional sync)
        const isAuthenticated = typeof localStorage !== 'undefined' && localStorage.getItem('sessionToken');
        if (isAuthenticated) {
          await this.updateBackendSubscriptionStatus(true);
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log('✅ Purchases restored (guest user) - Pro features unlocked via StoreKit');
          }
        }
        return { success: true, restored: true };
      }

      return { success: true, restored: false };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Restore purchases failed:', error);
      }
      throw error;
    }
  }

  /**
   * Check current subscription status
   */
  async checkSubscriptionStatus(): Promise<SubscriptionStatus> {
    if (!isCapacitorEnvironment()) {
      return {
        isActive: false,
        productId: null,
        expiresDate: null,
        isInTrial: false,
        isInGracePeriod: false,
      };
    }

    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    try {
      const result = await CapacitorInAppPurchase.getActiveSubscriptions();
      
      if (isDevelopment) {
        console.log('📦 StoreKit getActiveSubscriptions result:', JSON.stringify(result, null, 2));
      }
      
      // Subscriptions array contains JSON strings, not just product IDs
      // Parse each subscription to check productId
      let isActive = false;
      if (result.subscriptions && Array.isArray(result.subscriptions)) {
        if (isDevelopment) {
          console.log(`🔍 Checking ${result.subscriptions.length} subscription(s) against product IDs: ${SUBSCRIPTION_PRODUCT_ID_MONTHLY}, ${SUBSCRIPTION_PRODUCT_ID_YEARLY}`);
        }
        
        for (const subscription of result.subscriptions) {
          try {
            // If it's already a string, parse it; if it's an object, use it directly
            const subData = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
            
            if (isDevelopment) {
              console.log('📋 Parsed subscription data:', subData);
            }
            
            // Check for both monthly and yearly subscriptions
            if (subData.productId === SUBSCRIPTION_PRODUCT_ID_MONTHLY || 
                subData.productId === SUBSCRIPTION_PRODUCT_ID_YEARLY) {
              isActive = true;
              if (isDevelopment) {
                console.log('✅ Subscription verified:', subData.productId);
              }
              break;
            }
          } catch (parseError) {
            if (isDevelopment) {
              console.log('⚠️ Parse error, trying direct match:', parseError);
            }
            // If parsing fails, check if it's the product ID directly (fallback)
            if (subscription === SUBSCRIPTION_PRODUCT_ID_MONTHLY || 
                subscription === SUBSCRIPTION_PRODUCT_ID_YEARLY) {
              isActive = true;
              if (isDevelopment) {
                console.log('✅ Subscription verified (direct match):', subscription);
              }
              break;
            }
          }
        }
      } else {
        if (isDevelopment) {
          console.log('⚠️ No subscriptions array found in result:', result);
        }
      }
      
      if (!isActive && result.subscriptions?.length > 0) {
        // Log warnings in development (these indicate potential issues)
        if (isDevelopment) {
          console.warn('⚠️ Active subscriptions found but product ID mismatch:', result.subscriptions);
          console.warn('⚠️ Expected product IDs:', SUBSCRIPTION_PRODUCT_ID_MONTHLY, 'or', SUBSCRIPTION_PRODUCT_ID_YEARLY);
        }
      } else if (!isActive && isDevelopment) {
        console.log('ℹ️ No active subscriptions found');
      }

      // Determine which product ID is active
      let activeProductId: string | null = null;
      if (isActive && result.subscriptions && Array.isArray(result.subscriptions)) {
        for (const subscription of result.subscriptions) {
          try {
            const subData = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
            if (subData.productId === SUBSCRIPTION_PRODUCT_ID_MONTHLY || 
                subData.productId === SUBSCRIPTION_PRODUCT_ID_YEARLY) {
              activeProductId = subData.productId;
              break;
            }
          } catch (e) {
            if (subscription === SUBSCRIPTION_PRODUCT_ID_MONTHLY || 
                subscription === SUBSCRIPTION_PRODUCT_ID_YEARLY) {
              activeProductId = subscription as string;
              break;
            }
          }
        }
      }

      return {
        isActive,
        productId: activeProductId,
        expiresDate: null, // Plugin doesn't provide expiry date
        isInTrial: false, // Plugin doesn't provide trial status
        isInGracePeriod: false, // Plugin doesn't provide grace period status
      };
    } catch (error) {
      console.error('❌ Failed to check subscription status:', error);
      return {
        isActive: false,
        productId: null,
        expiresDate: null,
        isInTrial: false,
        isInGracePeriod: false,
      };
    }
  }

  /**
   * Verify transaction with backend (for logging guest transactions)
   * Non-blocking - failures don't affect purchase flow
   */
  private async verifyTransactionWithBackend(transactionId: string): Promise<void> {
    try {
      // Get API base URL (same as userDataApi)
      const isLocalWebDev = process.env.NODE_ENV === 'development' && 
        typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1');
      
      const API_BASE_URL = isLocalWebDev 
        ? 'http://10.0.2.2:8787'
        : 'https://mletras-auth-api-dev.belicongroup.workers.dev';

      // Get verification token from environment (set in .env file)
      const verifyToken = import.meta.env?.VITE_VERIFY_ENDPOINT_TOKEN;
      
      if (!verifyToken) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ VITE_VERIFY_ENDPOINT_TOKEN not set - skipping transaction verification');
          console.warn('💡 To enable transaction logging, add VITE_VERIFY_ENDPOINT_TOKEN to your .env file');
        }
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('📡 Sending verification request to:', `${API_BASE_URL}/verify-transaction`);
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
        const errorText = await response.text();
        if (process.env.NODE_ENV !== 'production') {
          console.error('❌ Verification request failed:', response.status, errorText);
        }
        throw new Error(`Verification failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Transaction verified and logged:', transactionId, data);
      }
      return data;
    } catch (error) {
      // Don't throw - this is for logging only
      throw error;
    }
  }

  /**
   * Get detailed subscription information including transaction metadata
   * Returns transaction ID, purchase date, and other subscription details
   */
  async getSubscriptionDetails(): Promise<SubscriptionDetails | null> {
    if (!isCapacitorEnvironment()) {
      return null;
    }

    try {
      const result = await CapacitorInAppPurchase.getActiveSubscriptions();
      
      if (result.subscriptions && Array.isArray(result.subscriptions)) {
        for (const subscription of result.subscriptions) {
          try {
            const subData = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
            
            if (subData.productId === SUBSCRIPTION_PRODUCT_ID_MONTHLY || 
                subData.productId === SUBSCRIPTION_PRODUCT_ID_YEARLY) {
              // Extract relevant metadata
              const details: SubscriptionDetails = {
                transactionId: subData.transactionId,
                originalTransactionId: subData.originalTransactionId,
                purchaseDate: subData.purchaseDate,
                expiresDate: subData.expiresDate,
                productId: subData.productId,
              };
              
              // Include any additional metadata fields
              if (subData.webOrderLineItemId) details.webOrderLineItemId = subData.webOrderLineItemId;
              if (subData.quantity) details.quantity = subData.quantity;
              if (subData.type) details.type = subData.type;
              if (subData.inAppOwnershipType) details.inAppOwnershipType = subData.inAppOwnershipType;
              
              if (process.env.NODE_ENV !== 'production') {
                console.log('📋 Subscription details extracted:', details);
              }
              return details;
            }
          } catch (parseError) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('⚠️ Failed to parse subscription data:', parseError);
            }
            continue;
          }
        }
      }
      
      return null;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Failed to get subscription details:', error);
      }
      return null;
    }
  }

  /**
   * Update subscription status on backend (optional - only for authenticated users)
   * Guest users can purchase and use Pro features without backend sync
   */
  private async updateBackendSubscriptionStatus(isPro: boolean, transactionId?: string): Promise<void> {
    try {
      // Call backend API to update subscription status
      // This endpoint needs to be created in your backend
      await userDataApi.updateSubscriptionStatus(isPro, transactionId);
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Backend subscription status updated');
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Failed to update backend subscription status:', error);
      }
      // Don't throw - subscription is still valid even if backend update fails
      // Guest users don't need backend sync to use Pro features
    }
  }
}

export const subscriptionService = new SubscriptionService();

