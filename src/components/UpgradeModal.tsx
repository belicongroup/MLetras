import { useState, useEffect } from "react";
import { Crown, Check, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { subscriptionService, SUBSCRIPTION_PRODUCT_ID_MONTHLY, SUBSCRIPTION_PRODUCT_ID_YEARLY } from "@/services/subscriptionService";
import { useAuth } from "@/contexts/AuthContext";
import { useProStatus } from "@/hooks/useProStatus";
import { getPlatform } from "@/lib/capacitor";
import { toast } from "sonner";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { refreshUser, isAuthenticated } = useAuth();
  const { isPro, isLoading: isProLoading } = useProStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [monthlyPrice, setMonthlyPrice] = useState<string>("$9.99");
  const [yearlyPrice, setYearlyPrice] = useState<string>("$99.99");
  const [monthlyTitle, setMonthlyTitle] = useState<string>("MLetras Pro");
  const [yearlyTitle, setYearlyTitle] = useState<string>("MLetras Pro Yearly");

  // Load product info when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProductInfo();
    }
  }, [isOpen]);

  const loadProductInfo = async () => {
    try {
      // Load monthly product info
      const monthlyProduct = await subscriptionService.getProductInfo(SUBSCRIPTION_PRODUCT_ID_MONTHLY);
      if (monthlyProduct.price) setMonthlyPrice(monthlyProduct.price);
      if (monthlyProduct.title) setMonthlyTitle(monthlyProduct.title);

      // Load yearly product info
      try {
        const yearlyProduct = await subscriptionService.getProductInfo(SUBSCRIPTION_PRODUCT_ID_YEARLY);
        if (yearlyProduct.price) setYearlyPrice(yearlyProduct.price);
        if (yearlyProduct.title) setYearlyTitle(yearlyProduct.title);
      } catch (yearlyError) {
        // Yearly product might not be available yet, that's okay - use default price
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Yearly product not available:', yearlyError);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to load product info:', error);
      }
    }
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const productId = selectedPlan === 'monthly' ? SUBSCRIPTION_PRODUCT_ID_MONTHLY : SUBSCRIPTION_PRODUCT_ID_YEARLY;
      const result = await subscriptionService.purchaseSubscription(productId);
      
      if (result.success) {
        // StoreKit may need a moment to update, so retry verification with delays
        let verified = false;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (!verified && attempts < maxAttempts) {
          // Wait a bit before checking (first attempt is immediate)
          if (attempts > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          const status = await subscriptionService.checkSubscriptionStatus();
          if (process.env.NODE_ENV !== 'production') {
            console.log(`🔍 Verification attempt ${attempts + 1}/${maxAttempts}:`, status);
          }
          
          if (status.isActive) {
            verified = true;
            toast.success("Welcome to MLetras Pro! 🎉");
            
            // Trigger subscription update event immediately (for all users)
            window.dispatchEvent(new Event('subscription-updated'));
            
            // Only refresh user data if authenticated (for backend sync)
            if (isAuthenticated) {
              try {
                await refreshUser();
              } catch (error) {
                if (process.env.NODE_ENV !== 'production') {
                  console.warn('⚠️ Backend sync failed (non-blocking):', error);
                }
              }
            } else {
              if (process.env.NODE_ENV !== 'production') {
                console.log('✅ Guest purchase successful - Pro features unlocked via StoreKit');
              }
            }
            
            // Close modal after a brief delay - allow all users to use app immediately
            setTimeout(() => {
              onClose();
            }, 500);
            break;
          }
          
          attempts++;
        }
        
        if (!verified) {
          // StoreKit verification pending - dispatch event and show helpful message
          // StoreKit might just need more time to update
          if (process.env.NODE_ENV !== 'production') {
            console.warn('⚠️ StoreKit verification pending - Pro features may activate shortly');
          }
          window.dispatchEvent(new Event('subscription-updated'));
          
          // Show informative message with next steps
          toast.success("Purchase completed! Your purchase was successful. If Pro features don't unlock, please try restoring purchases or contact support.", {
            duration: 5000,
          });
          
          if (isAuthenticated) {
            try {
              await refreshUser();
            } catch (error) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn('⚠️ Backend sync failed (non-blocking):', error);
              }
            }
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.log('✅ Guest purchase successful - Pro features will unlock via StoreKit');
            }
          }
          // Close modal for all users - allow immediate use of app
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      } else {
        toast.error("Purchase failed. Please try again.");
      }
    } catch (error: any) {
      // Handle user cancellation gracefully - check multiple error formats
      const errorMessage = error?.message || error?.errorMessage || JSON.stringify(error);
      const isCancelled = 
        errorMessage?.toLowerCase().includes('cancel') ||
        errorMessage?.toLowerCase().includes('cancelled') ||
        error?.message === 'Request Canceled' ||
        error?.errorMessage === 'Request Canceled';
      
      if (isCancelled) {
        // User cancelled - don't show error, just close loading state
        if (process.env.NODE_ENV !== 'production') {
          console.log('Purchase cancelled by user');
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.error('❌ Purchase error:', error);
        }
        toast.error("Purchase failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate savings percentage for yearly plan
  const calculateSavings = (): number => {
    if (!monthlyPrice || !yearlyPrice) return 0;
    
    // Extract numeric values from price strings (e.g., "$6.99" -> 6.99)
    const monthlyNum = parseFloat(monthlyPrice.replace(/[^0-9.]/g, ''));
    const yearlyNum = parseFloat(yearlyPrice.replace(/[^0-9.]/g, ''));
    
    if (!monthlyNum || !yearlyNum) return 0;
    
    // Calculate: (12 * monthly - yearly) / (12 * monthly) * 100
    const monthlyYearlyTotal = monthlyNum * 12;
    const savings = monthlyYearlyTotal - yearlyNum;
    const savingsPercent = Math.round((savings / monthlyYearlyTotal) * 100);
    
    return savingsPercent;
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await subscriptionService.restorePurchases();
      
      if (result.restored) {
        // Verify subscription from StoreKit (works for both guests and authenticated users)
        const status = await subscriptionService.checkSubscriptionStatus();
        
        if (status.isActive) {
          toast.success("Purchases restored! 🎉");
          
          // Only refresh user data if authenticated (for backend sync)
          // Guest users get Pro features immediately via StoreKit verification
          if (isAuthenticated) {
            await refreshUser();
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.log('✅ Guest restore successful - Pro features unlocked via StoreKit');
            }
            // Trigger update to enable Pro features
            window.dispatchEvent(new Event('subscription-updated'));
          }
          
          // Small delay to ensure StoreKit status is propagated
          setTimeout(() => {
            onClose();
          }, 500);
        } else {
          toast.info("No active subscription found.");
        }
      } else {
        toast.info("No previous purchases found.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to restore purchases.");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg p-0 !rounded-2xl overflow-y-auto max-h-[90vh] bg-gradient-to-b from-background via-background to-background">
        <DialogHeader className="px-4 pt-4 pb-3 bg-background z-20">
          <button
            onClick={onClose}
            className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          <div className="flex items-center justify-center mb-1">
            <div className="p-1.5 bg-gradient-primary rounded-lg shadow-lg">
              <Crown className="w-5 h-5 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            Upgrade to MLetras Pro
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* Features List */}
          <div className="flex flex-col items-start space-y-2">
            {[
              "Hands-free auto-scrolling lyrics",
              "Unlimited saved songs",
              "Unlimited folders and notes",
              "Dark theme for low-light environments"
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-2 w-full">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <p className="text-sm text-foreground">{feature}</p>
              </div>
            ))}
          </div>

          {/* Subscription Options */}
          <div className="space-y-2">
            {/* Monthly Subscription Option */}
            <div
              onClick={() => setSelectedPlan('monthly')}
              className={`bg-muted/50 rounded-lg p-3 border cursor-pointer transition-all ${
                selectedPlan === 'monthly'
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-sm">Monthly</p>
                  <p className="text-xl font-bold mt-0.5">{monthlyPrice}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">3-day Free Trial</p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'monthly'
                      ? 'border-primary bg-primary'
                      : 'border-border'
                  }`}
                >
                  {selectedPlan === 'monthly' && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
              </div>
            </div>

            {/* Yearly Subscription Option */}
            {yearlyPrice && (
              <div
                onClick={() => setSelectedPlan('yearly')}
                className={`bg-muted/50 rounded-lg p-3 border cursor-pointer transition-all relative ${
                  selectedPlan === 'yearly'
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {/* Savings badge */}
                {selectedPlan === 'yearly' && (
                  <div className="absolute -top-1.5 right-3 bg-primary text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                    Best Value
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm">Yearly</p>
                      {selectedPlan === 'yearly' && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                          Save compared to monthly
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold mt-0.5">{yearlyPrice}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">3-day Free Trial</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === 'yearly'
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    }`}
                  >
                    {selectedPlan === 'yearly' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cancel Anytime Transparency */}
          <p className="text-center text-xs text-muted-foreground">
            Cancel anytime in your Apple ID settings.
          </p>

          {/* Action Button */}
          <Button
            onClick={handlePurchase}
            disabled={isLoading || isRestoring}
            className="w-full bg-gradient-primary hover:bg-gradient-accent text-white font-semibold py-3 rounded-xl shadow-lg transition-all text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Start Free Trial"
            )}
          </Button>

          {/* Trial → Paid Conversion Clarity */}
          <p className="text-center text-xs text-muted-foreground leading-tight">
            After the 3-day free trial, the subscription will automatically renew at {selectedPlan === 'monthly' ? `${monthlyPrice}/month` : `${yearlyPrice}/year`} unless canceled.
          </p>

          {/* Auto-Renew Disclosure */}
          <p className="text-center text-xs text-muted-foreground leading-tight">
            Payment will be charged to your Apple ID. Subscription automatically renews unless canceled at least 24 hours before the end of the trial or current period.
          </p>

          {/* Footer Links */}
          <div className="flex flex-col gap-3 pt-3 border-t">
            {/* Manage Subscription - Show to all Pro users */}
            {isPro && (
              <button
                onClick={() => {
                  const platform = getPlatform();
                  if (platform === 'ios') {
                    window.open('https://apps.apple.com/account/subscriptions', '_blank');
                  } else {
                    // For Android or web, still provide link to Apple subscriptions (if user has Apple ID)
                    window.open('https://apps.apple.com/account/subscriptions', '_blank');
                  }
                }}
                className="text-xs text-primary hover:text-primary/80 transition-colors text-center"
              >
                Manage Subscription
              </button>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={handleRestore}
                disabled={isLoading || isRestoring}
                className="text-xs text-foreground hover:text-primary transition-colors"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin inline" />
                    Restoring...
                  </>
                ) : (
                  "Restore Purchases"
                )}
              </button>
              <div className="flex items-center gap-1.5">
                <a
                  href="https://mletras.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms
                </a>
                <span className="text-xs text-foreground">&</span>
                <a
                  href="https://mletras.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy
                </a>
              </div>
            </div>
          </div>

        </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

