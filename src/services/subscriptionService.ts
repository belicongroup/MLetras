// Subscription Service for StoreKit Integration
import { CapacitorInAppPurchase } from '@adplorg/capacitor-in-app-purchase';
import { isCapacitorEnvironment } from '@/lib/capacitor';
import { userDataApi } from './userDataApi';

// Your subscription product ID from App Store Connect
export const SUBSCRIPTION_PRODUCT_ID = 'com.mletras.pro.monthly';

export interface SubscriptionStatus {
  isActive: boolean;
  productId: string | null;
  expiresDate: string | null;
  isInTrial: boolean;
  isInGracePeriod: boolean;
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
      return {
        productId,
        price: '$6.99',
        title: 'MLetras Pro',
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
      console.error('❌ Failed to get product info:', error);
      // Return mock data on error for graceful degradation
      return {
        productId,
        price: '$6.99',
        title: 'MLetras Pro',
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
        // Update subscription status on backend
        await this.updateBackendSubscriptionStatus(true, result.transaction);
        
        return {
          success: true,
          transactionId: result.transaction,
        };
      }

      return { success: false };
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      
      // Handle user cancellation gracefully
      if (error.message?.includes('cancel') || error.message?.includes('Cancelled')) {
        throw new Error('Purchase cancelled by user');
      }
      
      throw error;
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
      const hasActiveSubscription = result.subscriptions?.includes(SUBSCRIPTION_PRODUCT_ID);

      if (hasActiveSubscription) {
        await this.updateBackendSubscriptionStatus(true);
        return { success: true, restored: true };
      }

      return { success: true, restored: false };
    } catch (error) {
      console.error('❌ Restore purchases failed:', error);
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

    try {
      const result = await CapacitorInAppPurchase.getActiveSubscriptions();
      
      const isActive = result.subscriptions?.includes(SUBSCRIPTION_PRODUCT_ID) || false;

      return {
        isActive,
        productId: isActive ? SUBSCRIPTION_PRODUCT_ID : null,
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
   * Update subscription status on backend
   */
  private async updateBackendSubscriptionStatus(isPro: boolean, transactionId?: string): Promise<void> {
    try {
      // Call backend API to update subscription status
      // This endpoint needs to be created in your backend
      await userDataApi.updateSubscriptionStatus(isPro, transactionId);
    } catch (error) {
      console.error('❌ Failed to update backend subscription status:', error);
      // Don't throw - subscription is still valid even if backend update fails
    }
  }
}

export const subscriptionService = new SubscriptionService();

