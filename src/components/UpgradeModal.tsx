import { useState, useEffect } from "react";
import { Crown, Check, X, Loader2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { subscriptionService } from "@/services/subscriptionService";
import { useAuth } from "@/contexts/AuthContext";
import { getPlatform } from "@/lib/capacitor";
import { toast } from "sonner";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [productPrice, setProductPrice] = useState<string>("$6.99");
  const [productTitle, setProductTitle] = useState<string>("MLetras Pro");

  const features = [
    { name: "Song searches", free: "Unlimited", pro: "Unlimited" },
    { name: "Folders", free: "1 folder", pro: "Unlimited" },
    { name: "Notes", free: "3 notes", pro: "Unlimited" },
    { name: "Auto-scroll", free: false, pro: true },
    { name: "Dark theme", free: false, pro: true },
    { name: "Priority support", free: false, pro: true },
  ];

  // Load product info when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProductInfo();
    }
  }, [isOpen]);

  const loadProductInfo = async () => {
    try {
      const product = await subscriptionService.getProductInfo();
      if (product.price) setProductPrice(product.price);
      if (product.title) setProductTitle(product.title);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to load product info:', error);
      }
    }
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const result = await subscriptionService.purchaseSubscription();
      
      if (result.success) {
        toast.success("Welcome to MLetras Pro! 🎉");
        await refreshUser();
        onClose();
      } else {
        toast.error("Purchase failed. Please try again.");
      }
    } catch (error: any) {
      if (error.message?.includes('cancel')) {
        // User cancelled - don't show error
        return;
      }
      toast.error(error.message || "Purchase failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await subscriptionService.restorePurchases();
      
      if (result.restored) {
        toast.success("Purchases restored! 🎉");
        await refreshUser();
        onClose();
      } else {
        toast.info("No previous purchases found.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to restore purchases.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManageSubscription = () => {
    const platform = getPlatform();
    if (platform === 'ios') {
      // Open iOS subscription management page
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
    } else {
      // For Android or web, provide instructions
      toast.info('Please manage your subscription through your device\'s app store settings.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 sticky top-0 bg-background z-20 border-b">
          <button
            onClick={onClose}
            className="absolute right-3 sm:right-4 top-3 sm:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sr-only">Close</span>
          </button>
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="p-2.5 sm:p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl sm:text-2xl font-bold">
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm text-muted-foreground px-2">
            Unlock all premium features and enhance your lyrics experience
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
          {/* Subscription Details - Required by Apple */}
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-3 sm:p-4 space-y-2 border shadow-sm">
            <div className="text-center space-y-1">
              <p className="font-semibold text-base sm:text-lg">{productTitle} Monthly</p>
              <p className="text-2xl sm:text-3xl font-bold">{productPrice}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">per month</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
                Billed monthly. Cancel anytime.
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 leading-relaxed">
                Auto-renewable subscription • 14-day free trial
              </p>
            </div>
          </div>

          {/* Pricing Comparison Table */}
          <div className="space-y-3 sm:space-y-4">
            {/* Plan Headers */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="text-center space-y-1 p-2 sm:p-3 rounded-lg bg-muted/30">
                <p className="font-semibold text-base sm:text-lg">Free</p>
                <div className="space-y-0">
                  <p className="text-xl sm:text-2xl font-bold">$0</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Forever</p>
                </div>
              </div>
              <div className="text-center space-y-1 p-2 sm:p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
                <p className="font-semibold text-base sm:text-lg">Pro</p>
                <div className="space-y-0">
                  <p className="text-xl sm:text-2xl font-bold">{productPrice}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">per month</p>
                </div>
              </div>
            </div>

            {/* Feature Rows */}
            <div className="space-y-1.5 sm:space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 sm:gap-4 py-2 sm:py-3 border-t first:border-t-0">
                  <div className="flex items-center">
                    <p className="text-xs sm:text-sm font-medium leading-tight">{feature.name}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    {typeof feature.free === 'string' ? (
                      <p className="text-xs sm:text-sm text-center leading-tight">{feature.free}</p>
                    ) : feature.free ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    {typeof feature.pro === 'string' ? (
                      <p className="text-xs sm:text-sm text-center leading-tight">{feature.pro}</p>
                    ) : feature.pro ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Trial Info */}
            <div className="text-center pt-1 sm:pt-2">
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                14-day free trial • Cancel anytime
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 sm:space-y-3">
            <Button
              onClick={handlePurchase}
              disabled={isLoading || isRestoring}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 sm:py-6 rounded-xl shadow-lg transition-all text-base sm:text-lg"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Start Free Trial
                </>
              )}
            </Button>
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center px-2 leading-relaxed">
              Your App Store account will be charged after the trial ends.
            </p>

            <Button
              onClick={handleRestore}
              disabled={isLoading || isRestoring}
              variant="outline"
              className="w-full py-3 sm:py-4 rounded-xl text-sm sm:text-base"
              size="lg"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  Restore Purchases
                </>
              )}
            </Button>

            <button
              onClick={onClose}
              className="w-full text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors py-2 sm:py-2.5"
              disabled={isLoading || isRestoring}
            >
              Cancel
            </button>
          </div>

          {/* Footer Note */}
          <div className="space-y-1.5 sm:space-y-2 pt-2 border-t">
            <p className="text-[10px] sm:text-xs text-center text-muted-foreground leading-relaxed px-1">
              By subscribing, you agree to our{" "}
              <a
                href="https://mletras.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Service
              </a>
              {" "}and{" "}
              <a
                href="https://mletras.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>
              . Subscription automatically renews unless canceled.
            </p>
            <button
              onClick={handleManageSubscription}
              className="w-full text-[10px] sm:text-xs text-primary hover:underline flex items-center justify-center gap-1 py-1"
            >
              Manage Subscription
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

