import { Crown, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const handleUpgrade = () => {
    // TODO: Implement actual purchase flow
    // This will integrate with Google Play / Apple App Store / Stripe
    console.log("🚧 Purchase flow not yet implemented");
    alert("Purchase flow coming soon! This will integrate with your payment provider.");
  };

  const handleRestorePurchase = () => {
    // TODO: Implement restore purchase flow
    console.log("🚧 Restore purchase not yet implemented");
    alert("Restore purchase coming soon!");
  };

  const features = [
    { name: "Song searches", free: "Unlimited", pro: "Unlimited" },
    { name: "Folders", free: "1 folder", pro: "Unlimited" },
    { name: "Notes", free: "3 notes", pro: "Unlimited" },
    { name: "Auto-scroll", free: false, pro: true },
    { name: "Dark theme", free: false, pro: true },
    { name: "Priority support", free: false, pro: true },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl shadow-lg">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription className="text-center">
            Unlock all premium features and enhance your lyrics experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pricing Comparison Table */}
          <div className="space-y-4">
            {/* Plan Headers */}
            <div className="grid grid-cols-3 gap-4">
              <div></div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-lg">Free</p>
                <div className="space-y-0">
                  <p className="text-2xl font-bold">$0</p>
                  <p className="text-xs text-muted-foreground">Forever</p>
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-lg">Pro</p>
                <div className="space-y-0">
                  <p className="text-2xl font-bold">$6.99</p>
                  <p className="text-xs text-muted-foreground">per month</p>
                </div>
              </div>
            </div>

            {/* Feature Rows */}
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 py-3 border-t">
                  <div className="flex items-center">
                    <p className="text-sm font-medium">{feature.name}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    {typeof feature.free === 'string' ? (
                      <p className="text-sm text-center">{feature.free}</p>
                    ) : feature.free ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    {typeof feature.pro === 'string' ? (
                      <p className="text-sm text-center">{feature.pro}</p>
                    ) : feature.pro ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Trial Info */}
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                14-day free trial • Cancel anytime
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-6"
              size="lg"
            >
              <Crown className="w-5 h-5 mr-2" />
              Start Free Trial
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full"
              size="sm"
            >
              Cancel
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-center text-muted-foreground">
            By subscribing, you agree to our Terms of Service and Privacy Policy.
            Subscription automatically renews unless canceled.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

