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

  const proFeatures = [
    "Unlimited folders for organizing your songs",
    "Unlimited notes for your lyrics",
    "Dark mode for comfortable viewing",
    "Auto-scroll with adjustable speeds",
    "Priority customer support",
    "Ad-free experience",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
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
          {/* Features List */}
          <div className="space-y-3">
            {proFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <div className="p-1 bg-green-100 rounded-full">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-foreground">{feature}</p>
              </div>
            ))}
          </div>

          {/* Pricing Card */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Special Launch Price
              </p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl font-bold text-primary">$4.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Cancel anytime • 7-day free trial
              </p>
            </div>
          </Card>

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
              onClick={handleRestorePurchase}
              variant="ghost"
              className="w-full"
              size="sm"
            >
              Restore Previous Purchase
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

